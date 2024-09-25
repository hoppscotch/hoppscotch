use hoppscotch_interceptor_lib::{
    model::{
        AuthKeyResponse, ConfirmedOTPRequest, HandshakeResponse, KeyValuePair, OTPReceiveRequest,
        RunRequestResponse,
    },
    route,
    state::AppState,
};
use log::{info, warn};
use mockito::Server;
use serde_json::json;
use std::sync::Arc;
use warp::test::request;

async fn setup() -> (
    Arc<AppState>,
    impl warp::Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone,
) {
    let _ = env_logger::builder().is_test(true).try_init();
    let state = Arc::new(AppState::new());

    let mock_app_handle = hoppscotch_interceptor_lib::app_handle_ext::MockAppHandle;

    let routes = route::route(state.clone(), mock_app_handle);

    (state, routes)
}

#[tokio::test]
async fn test_full_flow_success() {
    let (_state, routes) = setup().await;

    info!("Starting full flow success test");

    let handshake_resp = request()
        .method("GET")
        .path("/handshake")
        .reply(&routes)
        .await;

    info!("Handshake response: {:?}", handshake_resp);
    assert_eq!(handshake_resp.status(), 200);

    let handshake_body: HandshakeResponse = serde_json::from_slice(handshake_resp.body()).unwrap();
    assert_eq!(handshake_body.status, "success");

    let otp = "123456".to_string();
    let receive_otp_resp = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    info!("Receive OTP response: {:?}", receive_otp_resp);
    assert_eq!(receive_otp_resp.status(), 200);

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    info!("Verify OTP response: {:?}", verify_resp);
    assert_eq!(verify_resp.status(), 200);

    let auth_resp: AuthKeyResponse = serde_json::from_slice(verify_resp.body()).unwrap();
    let auth_key = auth_resp.auth_key;

    let mut server = Server::new_async().await;
    let mock = server
        .mock("GET", "/test")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(r#"{"message": "success"}"#)
        .create_async()
        .await;

    let req_body = json!({
        "req_id": 1,
        "method": "GET",
        "endpoint": format!("{}/test", server.url()),
        "parameters": [],
        "headers": [],
        "body": null,
        "validate_certs": false,
        "root_cert_bundle_files": [],
        "client_cert": null
    });

    let request_resp = request()
        .method("POST")
        .path("/request")
        .header("Authorization", &auth_key)
        .json(&req_body)
        .reply(&routes)
        .await;

    info!("Request response: {:?}", request_resp);
    assert_eq!(request_resp.status(), 200);

    let run_request_resp: RunRequestResponse = serde_json::from_slice(request_resp.body()).unwrap();
    assert_eq!(run_request_resp.status, 200);
    assert!(!run_request_resp.data.is_empty());

    mock.assert_async().await;

    let cancel_resp = request()
        .method("POST")
        .path("/cancel-request/1")
        .header("Authorization", &auth_key)
        .reply(&routes)
        .await;

    info!("Cancel request response: {:?}", cancel_resp);
    assert_eq!(cancel_resp.status(), 404);

    info!("Full flow success test completed");
}

#[tokio::test]
async fn test_invalid_otp() {
    let (_, routes) = setup().await;

    info!("Starting invalid OTP test");

    let valid_otp = "123456".to_string();
    let _ = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: valid_otp })
        .reply(&routes)
        .await;

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest {
            otp: "invalid".to_string(),
        })
        .reply(&routes)
        .await;

    info!("Invalid OTP response: {:?}", verify_resp);
    assert_eq!(verify_resp.status(), 400);

    info!("Invalid OTP test completed");
}

#[tokio::test]
async fn test_unauthorized_request() {
    let (_, routes) = setup().await;

    info!("Starting unauthorized request test");

    let req_body = json!({
        "req_id": 1,
        "method": "GET",
        "endpoint": "https://example.com",
        "parameters": [],
        "headers": [],
        "body": null,
        "validate_certs": true,
        "root_cert_bundle_files": [],
        "client_cert": null
    });

    let request_resp = request()
        .method("POST")
        .path("/request")
        .header("Authorization", "invalid_auth_key")
        .json(&req_body)
        .reply(&routes)
        .await;

    info!("Unauthorized request response: {:?}", request_resp);
    assert_eq!(request_resp.status(), 401);

    info!("Unauthorized request test completed");
}

#[tokio::test]
async fn test_request_with_parameters_and_headers() {
    let (_, routes) = setup().await;

    info!("Starting request with parameters and headers test");

    let otp = "123456".to_string();
    let _ = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp })
        .reply(&routes)
        .await;

    let auth_resp: AuthKeyResponse = serde_json::from_slice(verify_resp.body()).unwrap();
    let auth_key = auth_resp.auth_key;

    let mut server = Server::new_async().await;

    let mock = server
        .mock("GET", "/test")
        .match_query(mockito::Matcher::UrlEncoded(
            "param1".into(),
            "value1".into(),
        ))
        .match_header("X-Custom-Header", "test_value")
        .with_status(200)
        .with_body(r#"{"message": "success"}"#)
        .create_async()
        .await;

    let req_body = json!({
        "req_id": 1,
        "method": "GET",
        "endpoint": format!("{}/test", server.url()),
        "parameters": [
            {"key": "param1", "value": "value1"}
        ],
        "headers": [
            {"key": "X-Custom-Header", "value": "test_value"}
        ],
        "body": null,
        "validate_certs": false,
        "root_cert_bundle_files": [],
        "client_cert": null
    });

    let request_resp = request()
        .method("POST")
        .path("/request")
        .header("Authorization", &auth_key)
        .json(&req_body)
        .reply(&routes)
        .await;

    info!(
        "Request with parameters and headers response: {:?}",
        request_resp
    );
    assert_eq!(request_resp.status(), 200);

    mock.assert_async().await;

    info!("Request with parameters and headers test completed");
}

#[tokio::test]
async fn test_request_with_body() {
    let (_, routes) = setup().await;

    info!("Starting request with body test");

    let otp = "123456".to_string();
    let _ = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp })
        .reply(&routes)
        .await;

    let auth_resp: AuthKeyResponse = serde_json::from_slice(verify_resp.body()).unwrap();
    let auth_key = auth_resp.auth_key;

    let mut server = Server::new_async().await;

    let mock = server
        .mock("POST", "/test")
        .match_body(mockito::Matcher::Json(json!({"key": "value"})))
        .with_status(200)
        .with_body(r#"{"message": "received"}"#)
        .create_async()
        .await;

    let req_body = json!({
        "req_id": 1,
        "method": "POST",
        "endpoint": format!("{}/test", server.url()),
        "parameters": [],
        "headers": [],
        "body": {
            "Text": "{\"key\":\"value\"}"
        },
        "validate_certs": false,
        "root_cert_bundle_files": [],
        "client_cert": null
    });

    let request_resp = request()
        .method("POST")
        .path("/request")
        .header("Authorization", &auth_key)
        .json(&req_body)
        .reply(&routes)
        .await;

    info!("Request with body response: {:?}", request_resp);
    assert_eq!(request_resp.status(), 200);

    mock.assert_async().await;

    info!("Request with body test completed");
}

#[tokio::test]
async fn test_otp_expiration() {
    let (state, routes) = setup().await;

    info!("Starting OTP expiration test");

    let otp = "123456".to_string();
    let _ = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    {
        let mut current_otp = state.current_otp.write().unwrap();
        if let Some((_, expiry)) = current_otp.as_mut() {
            *expiry = chrono::Utc::now() - chrono::Duration::minutes(6);
        }
    }

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp })
        .reply(&routes)
        .await;

    info!("Verify expired OTP response: {:?}", verify_resp);
    assert_eq!(verify_resp.status(), 400);

    info!("OTP expiration test completed");
}

#[tokio::test]
async fn test_cancel_nonexistent_request() {
    let (_, routes) = setup().await;

    info!("Starting cancel nonexistent request test");

    let otp = "123456".to_string();
    let _ = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp })
        .reply(&routes)
        .await;

    let auth_resp: AuthKeyResponse = serde_json::from_slice(verify_resp.body()).unwrap();
    let auth_key = auth_resp.auth_key;

    let cancel_resp = request()
        .method("POST")
        .path("/cancel-request/9999") // Non-existent request ID
        .header("Authorization", &auth_key)
        .reply(&routes)
        .await;

    info!("Cancel nonexistent request response: {:?}", cancel_resp);
    assert_eq!(cancel_resp.status(), 404);

    info!("Cancel nonexistent request test completed");
}

#[tokio::test]
async fn test_request_with_invalid_url() {
    let (_, routes) = setup().await;

    info!("Starting request with invalid URL test");

    let otp = "123456".to_string();
    let _ = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp })
        .reply(&routes)
        .await;

    let auth_resp: AuthKeyResponse = serde_json::from_slice(verify_resp.body()).unwrap();
    let auth_key = auth_resp.auth_key;

    let req_body = json!({
        "req_id": 1,
        "method": "GET",
        "endpoint": "invalid-url",
        "parameters": [],
        "headers": [],
        "body": null,
        "validate_certs": false,
        "root_cert_bundle_files": [],
        "client_cert": null
    });

    let request_resp = request()
        .method("POST")
        .path("/request")
        .header("Authorization", &auth_key)
        .json(&req_body)
        .reply(&routes)
        .await;

    info!("Request with invalid URL response: {:?}", request_resp);
    assert_eq!(request_resp.status(), 500);

    info!("Request with invalid URL test completed");
}

#[tokio::test]
async fn test_request_with_typically_forbidden_headers() {
    let (_, routes) = setup().await;

    info!("Starting request with typically forbidden headers test");

    let otp = "123456".to_string();
    let _ = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp })
        .reply(&routes)
        .await;

    let auth_resp: AuthKeyResponse = serde_json::from_slice(verify_resp.body()).unwrap();
    let auth_key = auth_resp.auth_key;

    let headers = vec![
        KeyValuePair {
            key: "User-Agent".to_string(),
            value: "HoppscotchInterceptorTest/1.0".to_string(),
        },
        KeyValuePair {
            key: "Accept".to_string(),
            value: "*/*".to_string(),
        },
        KeyValuePair {
            key: "Host".to_string(),
            value: "echo.hoppscotch.io".to_string(),
        },
        KeyValuePair {
            key: "Origin".to_string(),
            value: "https://example.com".to_string(),
        },
        KeyValuePair {
            key: "Referer".to_string(),
            value: "https://example.com".to_string(),
        },
        KeyValuePair {
            key: "Cookie".to_string(),
            value: "test=value".to_string(),
        },
        KeyValuePair {
            key: "Sec-Fetch-Mode".to_string(),
            value: "cors".to_string(),
        },
        KeyValuePair {
            key: "Proxy-Authorization".to_string(),
            value: "Basic dXNlcjpwYXNz".to_string(),
        },
    ];

    let req_body = json!({
        "req_id": 1,
        "method": "GET",
        "endpoint": "https://echo.hoppscotch.io",
        "parameters": [],
        "headers": headers,
        "body": null,
        "validate_certs": true,
        "root_cert_bundle_files": [],
        "client_cert": null
    });

    info!("Request body: {:?}", req_body);

    let request_resp = request()
        .method("POST")
        .path("/request")
        .header("Authorization", &auth_key)
        .json(&req_body)
        .reply(&routes)
        .await;

    info!("Request response: {:?}", request_resp);
    assert_eq!(request_resp.status(), 200);

    let raw_body = String::from_utf8_lossy(request_resp.body());
    info!("Raw response body: {}", raw_body);

    match serde_json::from_slice::<RunRequestResponse>(request_resp.body()) {
        Ok(run_request_resp) => {
            info!("Parsed RunRequestResponse: {:?}", run_request_resp);

            let echo_response_str = String::from_utf8_lossy(&run_request_resp.data);
            info!("Echo server response (as string): {}", echo_response_str);

            match serde_json::from_str::<serde_json::Value>(&echo_response_str) {
                Ok(echo_json) => {
                    info!("Parsed echo server JSON: {:?}", echo_json);

                    if let Some(headers) = echo_json.get("headers") {
                        for header in &[
                            "User-Agent",
                            "Accept",
                            "Host",
                            "Origin",
                            "Referer",
                            "Cookie",
                            "Sec-Fetch-Mode",
                        ] {
                            assert!(
                                headers.get(header.to_lowercase()).is_some(),
                                "Header '{}' should be present in the request",
                                header
                            );
                        }
                        if headers.get("proxy-authorization").is_none() {
                            warn!("Proxy-Authorization header was not present in the echo server response. This may be due to security measures.");
                        }
                        info!("All expected headers (except possibly Proxy-Authorization) were present in the request");
                    } else {
                        panic!("No 'headers' field in echo server response");
                    }
                }
                Err(e) => {
                    panic!(
                        "Failed to parse echo server response as JSON: {:?}\nResponse: {}",
                        e, echo_response_str
                    );
                }
            }
        }
        Err(e) => {
            panic!("Failed to parse response as RunRequestResponse: {:?}", e);
        }
    }

    info!("Request with typically forbidden headers test completed");
}

#[tokio::test]
async fn test_otp_flow() {
    let (_, routes) = setup().await;

    info!("Starting OTP flow test");

    let otp = "123456".to_string();
    let receive_otp_resp = request()
        .method("POST")
        .path("/receive-otp")
        .json(&OTPReceiveRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    info!("Receive OTP response: {:?}", receive_otp_resp);
    assert_eq!(receive_otp_resp.status(), 200);

    let verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest { otp: otp.clone() })
        .reply(&routes)
        .await;

    info!("Verify correct OTP response: {:?}", verify_resp);
    assert_eq!(verify_resp.status(), 200);

    let auth_resp: AuthKeyResponse = serde_json::from_slice(verify_resp.body()).unwrap();
    assert!(!auth_resp.auth_key.is_empty());

    let incorrect_verify_resp = request()
        .method("POST")
        .path("/verify-otp")
        .json(&ConfirmedOTPRequest {
            otp: "wrong_otp".to_string(),
        })
        .reply(&routes)
        .await;

    info!("Verify incorrect OTP response: {:?}", incorrect_verify_resp);
    assert_eq!(incorrect_verify_resp.status(), 400);

    info!("OTP flow test completed");
}
