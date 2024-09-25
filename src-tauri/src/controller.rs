use crate::{
    app_handle_ext::AppHandleExt,
    model::{
        AuthKeyResponse, BodyDef, ClientCertDef, ConfirmedOTPRequest, FormDataValue,
        HandshakeResponse, KeyValuePair, OTPReceiveRequest, ReqBodyAction, RequestDef,
        RunRequestError, RunRequestResponse,
    },
    state::AppState,
};
use chrono::{Duration, Utc};
use reqwest::{
    header::{HeaderMap, HeaderName, HeaderValue},
    Certificate, ClientBuilder, Identity,
};
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

pub async fn receive_otp<T: AppHandleExt>(
    otp_request: OTPReceiveRequest,
    state: Arc<AppState>,
    app_handle: T,
) -> Result<impl Reply, Rejection> {
    state.set_otp(otp_request.otp.clone());
    app_handle.emit("otp_received", otp_request.otp).unwrap();

    Ok(with_status(
        json(&json!({ "message": "OTP received and stored" })),
        StatusCode::OK,
    ))
}

pub async fn verify_otp<T: AppHandleExt>(
    confirmed_otp: ConfirmedOTPRequest,
    state: Arc<AppState>,
    app_handle: T,
) -> Result<impl Reply, Rejection> {
    if state.validate_otp(&confirmed_otp.otp) {
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
            json(&json!({ "error": "Invalid or expired OTP" })),
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

    let method = reqwest::Method::from_bytes(req.method.as_bytes())
        .map_err(|_| warp::reject::custom(RunRequestError::InvalidMethod))?;

    let endpoint_url = reqwest::Url::parse(&req.endpoint)
        .map_err(|_| warp::reject::custom(RunRequestError::InvalidUrl))?;

    let headers = req
        .headers
        .iter()
        .map(|KeyValuePair { key, value }| {
            Ok((
                key.parse::<HeaderName>().map_err(|_| ())?,
                value.parse::<HeaderValue>().map_err(|_| ())?,
            ))
        })
        .collect::<Result<HeaderMap, ()>>()
        .map_err(|_| warp::reject::custom(RunRequestError::InvalidHeaders))?;

    let body_action = convert_bodydef_to_req_action(&req);

    let client_identity = get_identity_from_req(&req)
        .map_err(|_| warp::reject::custom(RunRequestError::ClientCertError))?;

    let root_certs =
        parse_root_certs(&req).map_err(|_| warp::reject::custom(RunRequestError::RootCertError))?;

    let mut client_builder = ClientBuilder::new().danger_accept_invalid_certs(!req.validate_certs);

    for root_cert in root_certs {
        client_builder = client_builder.add_root_certificate(root_cert);
    }

    if let Some(identity) = client_identity {
        client_builder = client_builder.identity(identity);
    }

    let client = client_builder
        .build()
        .map_err(|e| warp::reject::custom(RunRequestError::RequestRunError(e.to_string())))?;

    let mut req_builder = client
        .request(method, endpoint_url)
        .query(
            &req.parameters
                .iter()
                .map(|KeyValuePair { key, value }| (key, value))
                .collect::<Vec<_>>(),
        )
        .headers(headers);

    req_builder = match body_action {
        None => req_builder,
        Some(ReqBodyAction::Body(body)) => req_builder.body(body),
        Some(ReqBodyAction::UrlEncodedForm(entries)) => req_builder.form(&entries),
        Some(ReqBodyAction::MultipartForm(form)) => req_builder.multipart(form),
    };

    let cancel_token = CancellationToken::new();

    state.add_cancellation_token(req.req_id, cancel_token.clone());

    let result = tokio::select! {
        _ = cancel_token.cancelled() => Err(warp::reject::custom(RunRequestError::RequestCancelled)),
        result = execute_request(req_builder) => {
            state.remove_cancellation_token(req.req_id);
            result.map_err(warp::reject::custom)
        }
    };

    Ok(with_status(json(&result?), StatusCode::OK))
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

fn convert_bodydef_to_req_action(req: &RequestDef) -> Option<ReqBodyAction> {
    match &req.body {
        None => None,
        Some(BodyDef::Text(text)) => Some(ReqBodyAction::Body(text.clone().into())),
        Some(BodyDef::URLEncoded(entries)) => Some(ReqBodyAction::UrlEncodedForm(
            entries
                .iter()
                .map(|KeyValuePair { key, value }| (key.clone(), value.clone()))
                .collect(),
        )),
        Some(BodyDef::FormData(entries)) => {
            let form = entries
                .iter()
                .fold(
                    reqwest::multipart::Form::new(),
                    |form, entry| match &entry.value {
                        FormDataValue::Text(value) => form.text(entry.key.clone(), value.clone()),
                        FormDataValue::File {
                            filename,
                            data,
                            mime,
                        } => form.part(
                            entry.key.clone(),
                            reqwest::multipart::Part::bytes(data.clone())
                                .file_name(filename.clone())
                                .mime_str(mime.as_str())
                                .expect("Error while setting File enum"),
                        ),
                    },
                );
            Some(ReqBodyAction::MultipartForm(form))
        }
    }
}

async fn execute_request(
    req_builder: reqwest::RequestBuilder,
) -> Result<RunRequestResponse, RunRequestError> {
    let start_time_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let response = req_builder
        .send()
        .await
        .map_err(|err| RunRequestError::RequestRunError(err.to_string()))?;

    let res_status = response.status();
    let res_headers = response.headers().clone();

    let res_body_bytes = response
        .bytes()
        .await
        .map_err(|err| RunRequestError::RequestRunError(err.to_string()))?;

    let end_time_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let response_status = res_status.as_u16();
    let response_status_text = res_status
        .canonical_reason()
        .unwrap_or("Unknown Status")
        .to_owned();

    let response_headers = res_headers
        .iter()
        .map(|(key, value)| KeyValuePair {
            key: key.as_str().to_owned(),
            value: value.to_str().unwrap_or("").to_owned(),
        })
        .collect();

    Ok(RunRequestResponse {
        status: response_status,
        status_text: response_status_text,
        headers: response_headers,
        data: res_body_bytes.into(),
        time_start_ms: start_time_ms,
        time_end_ms: end_time_ms,
    })
}

fn get_identity_from_req(req: &RequestDef) -> Result<Option<Identity>, reqwest::Error> {
    let result = match &req.client_cert {
        None => return Ok(None),
        Some(ClientCertDef::PEMCert {
            certificate_pem,
            key_pem,
        }) => Identity::from_pkcs8_pem(certificate_pem, key_pem),
        Some(ClientCertDef::PFXCert {
            certificate_pfx,
            password,
        }) => Identity::from_pkcs12_der(certificate_pfx, password),
    };
    Ok(Some(result?))
}

fn parse_root_certs(req: &RequestDef) -> Result<Vec<Certificate>, reqwest::Error> {
    let mut result = vec![];

    for cert_bundle_file in &req.root_cert_bundle_files {
        let mut certs = Certificate::from_pem_bundle(&cert_bundle_file)?;
        result.append(&mut certs);
    }

    Ok(result)
}

#[cfg(test)]
mod tests {

    use super::*;
    use warp::Reply;

    #[tokio::test]
    async fn test_handshake() {
        let response = handshake().await.unwrap();
        let result = response.into_response();
        assert_eq!(result.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_run_request_unauthorized() {
        let state = Arc::new(AppState::new());
        let auth_key = "invalid_auth_key".to_string();

        let req = RequestDef {
            req_id: 1,
            method: "GET".to_string(),
            endpoint: "https://example.com".to_string(),
            parameters: vec![],
            headers: vec![],
            body: None,
            validate_certs: false,
            root_cert_bundle_files: vec![],
            client_cert: None,
        };

        let response = run_request(req, auth_key, state).await.unwrap();
        let result = response.into_response();
        assert_eq!(result.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_run_request_invalid_method() {
        let state = Arc::new(AppState::new());
        let auth_key = "test_auth_key".to_string();
        let expiry = Utc::now() + Duration::hours(1);
        state.set_auth_token(auth_key.clone(), expiry);

        let req = RequestDef {
            req_id: 1,
            method: "INVALID".to_string(),
            endpoint: "https://example.com".to_string(),
            parameters: vec![],
            headers: vec![],
            body: None,
            validate_certs: false,
            root_cert_bundle_files: vec![],
            client_cert: None,
        };

        let response = run_request(req, auth_key, state).await.unwrap();
        let result = response.into_response();

        // NOTE: `StatusCode::OK` mean the agent returned good response,
        // even if the actual request might have failed.
        assert_eq!(result.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_run_request_invalid_url() {
        let state = Arc::new(AppState::new());
        let auth_key = "test_auth_key".to_string();
        let expiry = Utc::now() + Duration::hours(1);
        state.set_auth_token(auth_key.clone(), expiry);

        let req = RequestDef {
            req_id: 1,
            method: "GET".to_string(),
            endpoint: "invalid_url".to_string(),
            parameters: vec![],
            headers: vec![],
            body: None,
            validate_certs: false,
            root_cert_bundle_files: vec![],
            client_cert: None,
        };

        let response = run_request(req, auth_key, state).await;

        assert!(response.is_err());
    }

    #[tokio::test]
    async fn test_cancel_request_success() {
        let state = Arc::new(AppState::new());
        let auth_key = "test_auth_key".to_string();
        let expiry = Utc::now() + Duration::hours(1);
        state.set_auth_token(auth_key.clone(), expiry);

        let req_id = 1;
        let cancel_token = CancellationToken::new();
        state.add_cancellation_token(req_id, cancel_token);

        let response = cancel_request(req_id, auth_key, state).await.unwrap();
        let result = response.into_response();
        assert_eq!(result.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_cancel_request_unauthorized() {
        let state = Arc::new(AppState::new());
        let auth_key = "invalid_auth_key".to_string();
        let req_id = 1;

        let response = cancel_request(req_id, auth_key, state).await.unwrap();
        let result = response.into_response();
        assert_eq!(result.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_cancel_request_not_found() {
        let state = Arc::new(AppState::new());
        let auth_key = "test_auth_key".to_string();
        let expiry = Utc::now() + Duration::hours(1);
        state.set_auth_token(auth_key.clone(), expiry);

        let req_id = 999; // Non-existent request ID

        let response = cancel_request(req_id, auth_key, state).await.unwrap();
        let result = response.into_response();
        assert_eq!(result.status(), StatusCode::NOT_FOUND);
    }
}
