use axum::{
    body::{Body, Bytes},
    http::{Request, StatusCode},
};
use hoppscotch_agent_lib::{
    app_handle_ext::MockAppHandle,
    model::{
        AuthKeyResponse, ConfirmedRegistrationRequest, HandshakeResponse,
        RegistrationReceiveRequest,
    },
    route,
    state::AppState,
};
use std::sync::Arc;
use tower::ServiceExt;

async fn read_body(body: Body) -> Bytes {
    axum::body::to_bytes(body, usize::MAX).await.unwrap()
}

#[tokio::test]
async fn test_handshake() {
    let state = Arc::new(AppState::new());
    let app_handle = MockAppHandle;
    let app = route::route(state, app_handle);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/handshake")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = read_body(response.into_body()).await;
    let handshake_response: HandshakeResponse = serde_json::from_slice(&body).unwrap();

    assert_eq!(handshake_response.status, "success");
    assert_eq!(
        handshake_response.message,
        "Agent ready! Hopp in, we've got requests to catch!"
    );
}

#[tokio::test]
async fn test_receive_registration() {
    let state = Arc::new(AppState::new());
    let app_handle = MockAppHandle;
    let app = route::route(state.clone(), app_handle);

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
async fn test_verify_registration() {
    let state = Arc::new(AppState::new());
    let app_handle = MockAppHandle;
    let app = route::route(state.clone(), app_handle);

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
}

#[tokio::test]
async fn test_run_request() {
    let state = Arc::new(AppState::new());
    let app_handle = MockAppHandle;
    let app = route::route(state.clone(), app_handle);

    let auth_token = "valid_token".to_string();
    state.set_auth_token(auth_token.clone());

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
async fn test_cancel_request() {
    let state = Arc::new(AppState::new());
    let app_handle = MockAppHandle;
    let app = route::route(state.clone(), app_handle);

    let auth_token = "valid_token".to_string();
    state.set_auth_token(auth_token.clone());

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
