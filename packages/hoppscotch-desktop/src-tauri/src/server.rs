use std::io::{self, ErrorKind};
use std::net::{Ipv4Addr, Ipv6Addr, TcpListener};
use std::ops::RangeInclusive;

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

/// The OS error code for `EAFNOSUPPORT`, which a socket call returns on a
/// host with IPv6 disabled. `std` maps it to no `ErrorKind`, so the check
/// compares the raw code.
#[cfg(unix)]
const ADDRESS_FAMILY_NOT_SUPPORTED: i32 = libc::EAFNOSUPPORT;
#[cfg(windows)]
const ADDRESS_FAMILY_NOT_SUPPORTED: i32 = 10047;

/// Binds the first port in `range` that is free on `127.0.0.1` and that no
/// other process listens on at `::1`, and returns the `127.0.0.1` listener,
/// so the port stays reserved until `init` serves on it.
///
/// Login pages from earlier releases send the device token to `localhost`,
/// which a browser can resolve to `::1` first, so a port taken on `::1`
/// would send the token to that listener. A `::1` bind counts as free only
/// where it succeeds or where the host has no IPv6 loopback, as on a kernel
/// booted with `ipv6.disable=1`.
pub(crate) fn bind_listener(range: RangeInclusive<u16>) -> Option<TcpListener> {
    range.into_iter().find_map(|port| {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, port)).ok()?;
        is_free_on_ipv6_loopback(TcpListener::bind((Ipv6Addr::LOCALHOST, port))).then_some(listener)
    })
}

/// Any other error, `AddrInUse` and the `PermissionDenied` Windows returns
/// for a port bound with `SO_EXCLUSIVEADDRUSE` among them, counts as taken.
fn is_free_on_ipv6_loopback(bind: io::Result<TcpListener>) -> bool {
    match bind {
        Ok(_) => true,
        Err(e) => {
            e.kind() == ErrorKind::AddrNotAvailable
                || e.raw_os_error() == Some(ADDRESS_FAMILY_NOT_SUPPORTED)
        }
    }
}

pub(crate) fn init<R: Runtime>(
    listener: TcpListener,
    handle: tauri::AppHandle<R>,
) -> io::Result<u16> {
    tracing::info!("Beginning server initialization");

    let addr = listener.local_addr()?;
    let port = addr.port();
    listener.set_nonblocking(true)?;
    // `from_std` registers the socket with the reactor of the runtime it is
    // called under, so it runs here under the runtime that serves it, and a
    // failure returns from `init` before startup reports a port.
    let listener = {
        let runtime = tauri::async_runtime::handle();
        let _guard = runtime.inner().enter();
        tokio::net::TcpListener::from_std(listener)?
    };
    tracing::info!(local_addr = %addr, "Server bound successfully");

    let app = Router::new()
        .route(
            "/device-token",
            get(move |query| device_token(query, handle.clone())),
        )
        .layer(CorsLayer::very_permissive());

    tauri::async_runtime::spawn(async move {
        tracing::info!(
            address = %addr,
            port = port,
            "Starting HTTP server"
        );

        tracing::info!("Server starting");
        if let Err(e) = axum::serve(listener, app).await {
            tracing::error!(
                error.message = %e,
                error.type = %std::any::type_name_of_val(&e),
                "Server crashed"
            );
        }
    });

    Ok(port)
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

        let deserialized: AuthTokensQuery = serde_json::from_value(serialized).unwrap();
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

    #[test]
    fn test_bind_listener_reserves_a_free_port() {
        let port = TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
            .unwrap()
            .local_addr()
            .unwrap()
            .port();

        let listener = bind_listener(port..=port).unwrap();

        assert_eq!(listener.local_addr().unwrap().port(), port);
        assert!(TcpListener::bind((Ipv4Addr::LOCALHOST, port)).is_err());
    }

    #[test]
    fn test_bind_listener_skips_port_taken_on_ipv4_loopback() {
        let taken = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = taken.local_addr().unwrap().port();

        assert!(bind_listener(port..=port).is_none());
    }

    #[test]
    fn test_bind_listener_skips_port_taken_on_ipv6_loopback() {
        let Ok(taken) = TcpListener::bind((Ipv6Addr::LOCALHOST, 0)) else {
            return;
        };
        let port = taken.local_addr().unwrap().port();

        assert!(bind_listener(port..=port).is_none());
    }

    #[test]
    fn test_ipv6_loopback_counts_as_free_only_without_ipv6() {
        assert!(is_free_on_ipv6_loopback(Err(io::Error::from(
            ErrorKind::AddrNotAvailable
        ))));
        assert!(is_free_on_ipv6_loopback(Err(io::Error::from_raw_os_error(
            ADDRESS_FAMILY_NOT_SUPPORTED
        ))));
        assert!(!is_free_on_ipv6_loopback(Err(io::Error::from(
            ErrorKind::AddrInUse
        ))));
        assert!(!is_free_on_ipv6_loopback(Err(io::Error::from(
            ErrorKind::PermissionDenied
        ))));
    }
}
