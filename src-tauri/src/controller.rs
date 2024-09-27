use axum::{
    extract::{Path, State},
    Json,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use std::sync::Arc;

use crate::{
    app_handle_ext::AppHandleExt,
    error::{AppError, AppResult},
    model::{
        AuthKeyResponse, ConfirmedRegistrationRequest, HandshakeResponse,
        RegistrationReceiveRequest, RequestDef, RunRequestResponse,
    },
    state::AppState,
};
use chrono::{Duration, Utc};
use serde_json::json;
use uuid::Uuid;

pub async fn handshake() -> AppResult<Json<HandshakeResponse>> {
    Ok(Json(HandshakeResponse {
        status: "success".to_string(),
        message: "Interceptor ready! Hopp in, we've got requests to catch!".to_string(),
    }))
}

pub async fn receive_registration<T: AppHandleExt>(
    State((state, app_handle)): State<(Arc<AppState>, T)>,
    Json(registration_request): Json<RegistrationReceiveRequest>,
) -> AppResult<Json<serde_json::Value>> {
    state.set_registration(registration_request.registration.clone());

    app_handle
        .emit("registration_received", registration_request.registration)
        .map_err(|_| AppError::InternalServerError)?;

    Ok(Json(
        json!({ "message": "Registration received and stored" }),
    ))
}

pub async fn verify_registration<T: AppHandleExt>(
    State((state, app_handle)): State<(Arc<AppState>, T)>,
    Json(confirmed_registration): Json<ConfirmedRegistrationRequest>,
) -> AppResult<Json<AuthKeyResponse>> {
    state
        .validate_registration(&confirmed_registration.registration)
        .then_some(())
        .ok_or(AppError::InvalidRegistration)?;

    let auth_key = Uuid::new_v4().to_string();
    let expiry = Utc::now() + Duration::hours(24);

    let auth_payload = json!({
        "auth_key": auth_key,
        "expiry": expiry
    });

    app_handle
        .emit("authenticated", &auth_payload)
        .map_err(|_| AppError::InternalServerError)?;

    state.set_auth_token(auth_key.clone(), expiry);

    Ok(Json(AuthKeyResponse { auth_key, expiry }))
}

pub async fn run_request<T>(
    State((state, _app_handle)): State<(Arc<AppState>, T)>,
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>,
    Json(req): Json<RequestDef>,
) -> AppResult<Json<RunRequestResponse>> {
    state
        .validate_auth_token(auth_header.token())
        .then_some(())
        .ok_or(AppError::Unauthorized)?;

    let cancel_token = tokio_util::sync::CancellationToken::new();
    state.add_cancellation_token(req.req_id, cancel_token.clone());

    let req_id = req.req_id;
    let cancel_token_clone = cancel_token.clone();

    // Execute the HTTP request in a blocking thread pool and handles cancellation.
    //
    // It:
    // 1. Uses `spawn_blocking` to run the sync `run_request_task`
    //    without blocking the main Tokio runtime.
    // 2. Uses `select!` to concurrently wait for either
    //      a. the task to complete,
    //      b. or a cancellation signal.
    //
    // Why spawn_blocking?
    // - `run_request_task` uses synchronous curl operations which would block
    //   the async runtime if not run in a separate thread.
    // - `spawn_blocking` moves this operation to a thread pool designed for
    //   blocking tasks, so other async operations to continue unblocked.
    let result = tokio::select! {
        res = tokio::task::spawn_blocking(move || crate::interceptor::run_request_task(&req, cancel_token_clone)) => {
            match res {
                Ok(task_result) => task_result,
                Err(_) => Err(AppError::InternalServerError),
            }
        },
        _ = cancel_token.cancelled() => {
            Err(AppError::RequestCancelled)
        }
    };

    state.remove_cancellation_token(req_id);

    result.map(Json)
}

pub async fn cancel_request<T>(
    State((state, _app_handle)): State<(Arc<AppState>, T)>,
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>,
    Path(req_id): Path<usize>,
) -> AppResult<Json<serde_json::Value>> {
    state
        .validate_auth_token(auth_header.token())
        .then_some(())
        .ok_or(AppError::Unauthorized)?;

    if let Some((_, token)) = state.remove_cancellation_token(req_id) {
        token.cancel();
        Ok(Json(json!({"message": "Request cancelled successfully"})))
    } else {
        Err(AppError::RequestNotFound)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        app_handle_ext::MockAppHandle,
        model::{
            AuthKeyResponse, ConfirmedRegistrationRequest, HandshakeResponse,
            RegistrationReceiveRequest,
        },
        state::AppState,
    };
    use axum::{
        body::{Body, Bytes},
        http::{Request, StatusCode},
        routing::post,
        Router,
    };
    use chrono::{Duration, Utc};
    use std::sync::Arc;
    use tower::ServiceExt;
    use uuid::Uuid;

    async fn read_body(body: Body) -> Bytes {
        axum::body::to_bytes(body, usize::MAX).await.unwrap()
    }

    #[tokio::test]
    async fn test_handshake() {
        let result = handshake().await;
        assert!(result.is_ok());

        let json_response = result.unwrap();
        let handshake_response: &HandshakeResponse = &json_response;

        assert_eq!(handshake_response.status, "success");
        assert_eq!(
            handshake_response.message,
            "Interceptor ready! Hopp in, we've got requests to catch!"
        );
    }

    #[tokio::test]
    async fn test_receive_registration() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route(
                "/receive-registration",
                post(receive_registration::<MockAppHandle>),
            )
            .with_state((state.clone(), app_handle));

        let registration = "test_registration".to_string();
        let request = Request::builder()
            .method("POST")
            .uri("/receive-registration")
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::to_string(&RegistrationReceiveRequest {
                    registration: registration.clone(),
                })
                .unwrap(),
            ))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = read_body(response.into_body()).await;
        let json_response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json_response["message"], "Registration received and stored");

        assert_eq!(
            state
                .current_registration
                .read()
                .unwrap()
                .as_ref()
                .unwrap()
                .0,
            registration
        );
    }

    #[tokio::test]
    async fn test_verify_registration_valid() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route(
                "/verify-registration",
                post(verify_registration::<MockAppHandle>),
            )
            .with_state((state.clone(), app_handle));

        state.set_registration("valid_registration".to_string());

        let request = Request::builder()
            .method("POST")
            .uri("/verify-registration")
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::to_string(&ConfirmedRegistrationRequest {
                    registration: "valid_registration".to_string(),
                })
                .unwrap(),
            ))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = read_body(response.into_body()).await;
        let auth_key_response: AuthKeyResponse = serde_json::from_slice(&body).unwrap();
        assert!(!auth_key_response.auth_key.is_empty());
        assert!(auth_key_response.expiry > Utc::now());
    }

    #[tokio::test]
    async fn test_verify_registration_invalid() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route(
                "/verify-registration",
                post(verify_registration::<MockAppHandle>),
            )
            .with_state((state.clone(), app_handle));

        state.set_registration("valid_registration".to_string());

        let request = Request::builder()
            .method("POST")
            .uri("/verify-registration")
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::to_string(&ConfirmedRegistrationRequest {
                    registration: "invalid_registration".to_string(),
                })
                .unwrap(),
            ))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let body = read_body(response.into_body()).await;
        let json_response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json_response["error"], "Invalid or expired Registration");
    }

    #[tokio::test]
    async fn test_run_request_valid() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route("/request", post(run_request::<MockAppHandle>))
            .with_state((state.clone(), app_handle));

        let auth_token = Uuid::new_v4().to_string();
        state.set_auth_token(auth_token.clone(), Utc::now() + Duration::hours(1));

        let request_def = serde_json::json!({
            "req_id": 1,
            "method": "GET",
            "endpoint": "https://example.com",
            "headers": [],
            "body": null,
            "validate_certs": false,
            "root_cert_bundle_files": [],
            "client_cert": null,
            "proxy": null
        });

        let request = Request::builder()
            .method("POST")
            .uri("/request")
            .header("content-type", "application/json")
            .header("Authorization", format!("Bearer {}", auth_token))
            .body(Body::from(serde_json::to_string(&request_def).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_run_request_invalid_auth() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route("/request", post(run_request::<MockAppHandle>))
            .with_state((state.clone(), app_handle));

        let request_def = serde_json::json!({
            "req_id": 1,
            "method": "GET",
            "endpoint": "https://example.com",
            "headers": [],
            "body": null,
            "validate_certs": false,
            "root_cert_bundle_files": [],
            "client_cert": null,
            "proxy": null
        });

        let request = Request::builder()
            .method("POST")
            .uri("/request")
            .header("content-type", "application/json")
            .header("Authorization", "Bearer invalid_token")
            .body(Body::from(serde_json::to_string(&request_def).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        let body = read_body(response.into_body()).await;
        let error_response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(error_response["error"], "Unauthorized");
    }

    #[tokio::test]
    async fn test_cancel_request_valid() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route(
                "/cancel-request/:req_id",
                post(cancel_request::<MockAppHandle>),
            )
            .with_state((state.clone(), app_handle));

        let auth_token = Uuid::new_v4().to_string();
        state.set_auth_token(auth_token.clone(), Utc::now() + Duration::hours(1));

        let req_id = 1;
        state.add_cancellation_token(req_id, tokio_util::sync::CancellationToken::new());

        let request = Request::builder()
            .method("POST")
            .uri(&format!("/cancel-request/{}", req_id))
            .header("Authorization", format!("Bearer {}", auth_token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = read_body(response.into_body()).await;
        let json_response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json_response["message"], "Request cancelled successfully");

        assert!(state.remove_cancellation_token(req_id).is_none());
    }

    #[tokio::test]
    async fn test_cancel_request_invalid_auth() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route(
                "/cancel-request/:req_id",
                post(cancel_request::<MockAppHandle>),
            )
            .with_state((state.clone(), app_handle));

        let req_id = 1;
        state.add_cancellation_token(req_id, tokio_util::sync::CancellationToken::new());

        let request = Request::builder()
            .method("POST")
            .uri(&format!("/cancel-request/{}", req_id))
            .header("Authorization", "Bearer invalid_token")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        let body = read_body(response.into_body()).await;
        let error_response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(error_response["error"], "Unauthorized");
    }

    #[tokio::test]
    async fn test_cancel_request_not_found() {
        let state = Arc::new(AppState::new());
        let app_handle = MockAppHandle;

        let app = Router::new()
            .route(
                "/cancel-request/:req_id",
                post(cancel_request::<MockAppHandle>),
            )
            .with_state((state.clone(), app_handle));

        let auth_token = Uuid::new_v4().to_string();
        state.set_auth_token(auth_token.clone(), Utc::now() + Duration::hours(1));

        let req_id = 999; // Non-existent request ID

        let request = Request::builder()
            .method("POST")
            .uri(&format!("/cancel-request/{}", req_id))
            .header("Authorization", format!("Bearer {}", auth_token))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let body = read_body(response.into_body()).await;
        let error_response: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            error_response["error"],
            "Request not found or already completed"
        );
    }
}
