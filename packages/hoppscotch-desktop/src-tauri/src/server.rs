use std::net::SocketAddr;

use axum::{
    extract::Query,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Runtime};
use tower_http::cors::CorsLayer;

#[derive(Debug, Serialize, Deserialize)]
struct AuthTokensQuery {
    access_token: String,
    refresh_token: Option<String>,
}

async fn device_token<R: Runtime>(
    Query(token_query): Query<AuthTokensQuery>,
    handle: tauri::AppHandle<R>,
) -> Response {
    tracing::info!("Processing device token request");

    let serialized = match serde_json::to_value(token_query) {
        Ok(val) => val,
        Err(e) => {
            tracing::error!("Failed to serialize tokens: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    match handle.emit("hopp_auth://token", serialized) {
        Ok(_) => tracing::info!("Device token event emitted successfully"),
        Err(e) => tracing::error!(
            error.message = %e,
            error.type = %std::any::type_name_of_val(&e),
            "Failed to emit device token event"
        ),
    }
    StatusCode::OK.into_response()
}

pub(crate) fn init<R: Runtime>(port: u16, handle: tauri::AppHandle<R>) -> u16 {
    tracing::info!("Beginning server initialization");

    let app = Router::new()
        .route(
            "/device-token",
            get(move |query| device_token(query, handle.clone())),
        )
        .layer(CorsLayer::very_permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    tauri::async_runtime::spawn(async move {
        tracing::info!(
            address = %addr,
            port = port,
            "Starting HTTP server"
        );

        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => {
                tracing::info!(
                    local_addr = %l.local_addr().unwrap_or(addr),
                    "Server bound successfully"
                );
                l
            }
            Err(e) => {
                tracing::error!(
                    error.message = %e,
                    error.kind = ?e.kind(),
                    attempted_address = %addr,
                    "Server bind failed"
                );
                panic!("Could not bind to the unused port");
            }
        };

        tracing::info!("Server starting");
        if let Err(e) = axum::serve(listener, app).await {
            tracing::error!(
                error.message = %e,
                error.type = %std::any::type_name_of_val(&e),
                "Server crashed"
            );
        }
    });

    port
}

// `AuthTokensQuery` gets deserialized from query params on the `/device-token`
// endpoint. the desktop app receives auth tokens this way after the user does
// browser-based login and gets redirected back. `refresh_token` is optional
// because some auth flows (like the device code flow) don't always return one,
// and we don't wanna blow up if it's missing.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_tokens_query_deserialize_both_tokens() {
        let json = r#"{"access_token":"abc123","refresh_token":"def456"}"#;
        let query: AuthTokensQuery = serde_json::from_str(json).unwrap();

        assert_eq!(query.access_token, "abc123");
        assert_eq!(query.refresh_token, Some("def456".to_string()));
    }

    #[test]
    fn test_auth_tokens_query_deserialize_without_refresh() {
        let json = r#"{"access_token":"abc123"}"#;
        let query: AuthTokensQuery = serde_json::from_str(json).unwrap();

        assert_eq!(query.access_token, "abc123");
        assert_eq!(query.refresh_token, None);
    }

    #[test]
    fn test_auth_tokens_query_deserialize_fails_without_access_token() {
        let json = r#"{"refresh_token":"def456"}"#;
        let result: Result<AuthTokensQuery, _> = serde_json::from_str(json);

        assert!(result.is_err());
    }

    #[test]
    fn test_auth_tokens_query_roundtrip() {
        let original = AuthTokensQuery {
            access_token: "token_value".to_string(),
            refresh_token: Some("refresh_value".to_string()),
        };

        let serialized = serde_json::to_value(&original).unwrap();
        assert_eq!(serialized["access_token"], "token_value");
        assert_eq!(serialized["refresh_token"], "refresh_value");

        let deserialized: AuthTokensQuery =
            serde_json::from_value(serialized).unwrap();
        assert_eq!(deserialized.access_token, original.access_token);
        assert_eq!(deserialized.refresh_token, original.refresh_token);
    }

    #[test]
    fn test_auth_tokens_query_null_refresh_token() {
        let json = r#"{"access_token":"abc123","refresh_token":null}"#;
        let query: AuthTokensQuery = serde_json::from_str(json).unwrap();

        assert_eq!(query.access_token, "abc123");
        assert_eq!(query.refresh_token, None);
    }
}
