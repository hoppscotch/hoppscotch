use crate::{
    app_handle_ext::AppHandleExt,
    interceptor,
    model::{
        AuthKeyResponse, ConfirmedRegistrationRequest, HandshakeResponse,
        RegistrationReceiveRequest, RequestDef, RunRequestError,
    },
    state::AppState,
};
use chrono::{Duration, Utc};
use serde_json::json;
use std::sync::Arc;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;
use warp::{
    http::StatusCode,
    reject::Rejection,
    reply::{json, with_status, Reply},
};

pub async fn handshake() -> Result<impl Reply, Rejection> {
    Ok(with_status(
        json(&HandshakeResponse {
            status: "success".to_string(),
            message: "Interceptor ready! Hopp in, we've got requests to catch!".to_string(),
        }),
        StatusCode::OK,
    ))
}

pub async fn receive_registration<T: AppHandleExt>(
    registration_request: RegistrationReceiveRequest,
    state: Arc<AppState>,
    app_handle: T,
) -> Result<impl Reply, Rejection> {
    state.set_registration(registration_request.registration.clone());
    app_handle
        .emit("registration_received", registration_request.registration)
        .unwrap();

    Ok(with_status(
        json(&json!({ "message": "Registration received and stored" })),
        StatusCode::OK,
    ))
}

pub async fn verify_registration<T: AppHandleExt>(
    confirmed_registration: ConfirmedRegistrationRequest,
    state: Arc<AppState>,
    app_handle: T,
) -> Result<impl Reply, Rejection> {
    if state.validate_registration(&confirmed_registration.registration) {
        let auth_key = Uuid::new_v4().to_string();
        let expiry = Utc::now() + Duration::hours(1);

        let auth_payload = json!({
            "auth_key": auth_key,
            "expiry": expiry
        });

        app_handle.emit("authenticated", &auth_payload).unwrap();

        state.set_auth_token(auth_key.clone(), expiry);

        Ok(with_status(
            json(&AuthKeyResponse { auth_key, expiry }),
            StatusCode::OK,
        ))
    } else {
        Ok(with_status(
            json(&json!({ "error": "Invalid or expired Registration" })),
            StatusCode::BAD_REQUEST,
        ))
    }
}

pub async fn run_request(
    req: RequestDef,
    auth_header: String,
    state: Arc<AppState>,
) -> Result<impl Reply, Rejection> {
    if !state.validate_auth_token(&auth_header) {
        return Ok(with_status(
            json(&RunRequestError::Unauthorized),
            StatusCode::UNAUTHORIZED,
        ));
    }

    let cancel_token = CancellationToken::new();
    state.add_cancellation_token(req.req_id, cancel_token.clone());

    let req_id = req.req_id;
    let cancel_token_clone = cancel_token.clone();

    let result = tokio::select! {
        res = tokio::task::spawn_blocking(move || interceptor::run_request_task(&req, cancel_token_clone)) => {
            match res {
                Ok(task_result) => task_result,
                Err(_) => Err(RunRequestError::InternalError),
            }
        },
        _ = cancel_token.cancelled() => {
            Err(RunRequestError::RequestCancelled)
        }
    };

    state.remove_cancellation_token(req_id);

    match result {
        Ok(response) => Ok(with_status(json(&response), StatusCode::OK)),
        Err(error) => Ok(with_status(json(&error), StatusCode::INTERNAL_SERVER_ERROR)),
    }
}

pub async fn cancel_request(
    req_id: usize,
    auth_header: String,
    state: Arc<AppState>,
) -> Result<impl Reply, Rejection> {
    if !state.validate_auth_token(&auth_header) {
        return Ok(with_status(
            json(&RunRequestError::Unauthorized),
            StatusCode::UNAUTHORIZED,
        ));
    }

    if let Some((_, token)) = state.remove_cancellation_token(req_id) {
        token.cancel();

        Ok(with_status(
            json(&json!({"message": "Request cancelled successfully"})),
            StatusCode::OK,
        ))
    } else {
        Ok(with_status(
            json(&json!({"error": "Request not found or already completed"})),
            StatusCode::NOT_FOUND,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app_handle_ext::MockAppHandle;
    use chrono::Utc;
    use std::sync::Arc;
    use warp::http::StatusCode;
    use warp::hyper::body::to_bytes;

    #[tokio::test]
    async fn test_handshake() {
        let result = handshake().await.unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::OK);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert_eq!(json["status"], "success");
        assert!(json["message"]
            .as_str()
            .unwrap()
            .contains("Interceptor ready"));
    }

    #[tokio::test]
    async fn test_receive_registration() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;
        let registration_request = RegistrationReceiveRequest {
            registration: "test_registration".to_string(),
        };

        let result = receive_registration(registration_request, state.clone(), app_handle)
            .await
            .unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::OK);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert!(json["message"]
            .as_str()
            .unwrap()
            .contains("Registration received and stored"));

        let current_registration = state.current_registration.read().unwrap();
        assert!(current_registration.is_some());
        assert_eq!(
            current_registration.as_ref().unwrap().0,
            "test_registration"
        );
    }

    #[tokio::test]
    async fn test_verify_registration_valid() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        state.set_registration("valid_registration".to_string());

        let confirmed_registration = ConfirmedRegistrationRequest {
            registration: "valid_registration".to_string(),
        };

        let result = verify_registration(confirmed_registration, state.clone(), app_handle)
            .await
            .unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::OK);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert!(json["auth_key"].is_string());
        assert!(json["expiry"].is_string());

        let auth_key = json["auth_key"].as_str().unwrap();
        assert!(state.validate_auth_token(auth_key));
    }

    #[tokio::test]
    async fn test_verify_registration_invalid() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        state.set_registration("valid_registration".to_string());

        let confirmed_registration = ConfirmedRegistrationRequest {
            registration: "invalid_registration".to_string(),
        };

        let result = verify_registration(confirmed_registration, state.clone(), app_handle)
            .await
            .unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::BAD_REQUEST);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert_eq!(json["error"], "Invalid or expired Registration");
    }

    #[tokio::test]
    async fn test_run_request_unauthorized() {
        let state = Arc::new(AppState::new());
        let req = RequestDef {
            req_id: 1,
            method: "GET".to_string(),
            endpoint: "http://example.com".to_string(),
            parameters: vec![],
            headers: vec![],
            body: None,
            validate_certs: false,
            root_cert_bundle_files: vec![],
            client_cert: None,
            proxy: None,
        };

        let result = run_request(req, "invalid_token".to_string(), state)
            .await
            .unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::UNAUTHORIZED);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert_eq!(json, serde_json::json!(RunRequestError::Unauthorized));
    }

    #[tokio::test]
    async fn test_cancel_request_unauthorized() {
        let state = Arc::new(AppState::new());
        let req_id = 1;

        let result = cancel_request(req_id, "invalid_token".to_string(), state)
            .await
            .unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::UNAUTHORIZED);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert_eq!(json, serde_json::json!(RunRequestError::Unauthorized));
    }

    #[tokio::test]
    async fn test_cancel_request_not_found() {
        let state = Arc::new(AppState::new());
        let req_id = 1;
        let auth_token = "valid_token".to_string();
        state.set_auth_token(auth_token.clone(), Utc::now() + chrono::Duration::hours(1));

        let result = cancel_request(req_id, auth_token, state).await.unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::NOT_FOUND);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert_eq!(json["error"], "Request not found or already completed");
    }

    #[tokio::test]
    async fn test_cancel_request_success() {
        let state = Arc::new(AppState::new());
        let req_id = 1;
        let auth_token = "valid_token".to_string();
        state.set_auth_token(auth_token.clone(), Utc::now() + chrono::Duration::hours(1));

        state.add_cancellation_token(req_id, CancellationToken::new());

        let result = cancel_request(req_id, auth_token, state).await.unwrap();
        let (parts, body) = result.into_response().into_parts();

        assert_eq!(parts.status, StatusCode::OK);

        let body_bytes = to_bytes(body).await.unwrap();
        let body_str = String::from_utf8(body_bytes.to_vec()).unwrap();
        let json: serde_json::Value = serde_json::from_str(&body_str).unwrap();

        assert_eq!(json["message"], "Request cancelled successfully");
    }
}
