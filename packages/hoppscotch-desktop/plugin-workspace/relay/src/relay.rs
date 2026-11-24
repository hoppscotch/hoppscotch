use std::time::SystemTime;

use curl::easy::{Easy, InfoType};
use dashmap::DashMap;
use http::StatusCode;
use tokio_util::sync::CancellationToken;

use crate::{
    error::{RelayError, Result},
    interop::{Request, Response},
    request::CurlRequest,
    response::ResponseHandler,
    transfer::TransferHandler,
};

// `cancel` runs on another task from the transfer it stops, so each running
// request registers its token here by id, and the progress callback in
// `TransferHandler::handle_transfer` reads the same token.
lazy_static::lazy_static! {
    static ref ACTIVE_REQUESTS: DashMap<i64, CancellationToken> = DashMap::new();
}

// A cancel that lands after curl finished leaves the completed response
// intact, so only a transfer that failed while cancelled reports `Abort`.
fn settle<T>(result: Result<T>, cancelled: bool) -> Result<T> {
    match result {
        Err(_) if cancelled => {
            tracing::info!("Request was cancelled by user");
            Err(RelayError::Abort {
                message: "Request cancelled by user".into(),
            })
        }
        result => result,
    }
}

#[tracing::instrument(skip(request), fields(request_id = request.id), level = "debug")]
fn execute_request(request: &Request, cancel_token: &CancellationToken) -> Result<Response> {
    tracing::info!(
        method = %request.method,
        url = %crate::util::redact_url(&request.url),
        "Executing request"
    );

    let id = request.id;
    let mut handle = Easy::new();
    let start_time = SystemTime::now();

    let mut curl_request = CurlRequest::new(&mut handle, request);
    curl_request.prepare()?;

    // Marks where curl starts sending, with the method and the URL, its
    // userinfo and query values redacted.
    tracing::debug!(method = %request.method, url = %crate::util::redact_url(&request.url), "Sending request");

    handle.verbose(true).map_err(|e| RelayError::Network {
        message: "Failed to set verbose mode".into(),
        cause: Some(e.to_string()),
    })?;

    handle
        .debug_function(|info_type, data| {
            // `InfoType::Text` is curl's own commentary on connect, TLS and
            // redirects. The header and data types repeat the request and
            // response bytes, the `Authorization` and `Cookie` headers and
            // the body included, so they are dropped.
            if !matches!(info_type, InfoType::Text) {
                return;
            }
            if let Ok(s) = std::str::from_utf8(data) {
                if logs_a_secret(s) {
                    return;
                }
                tracing::debug!(info_type = ?info_type, s = ?s, "cURL debug fn");
            }
        })
        .map_err(|e| RelayError::Network {
            message: "Failed to set debug function".into(),
            cause: Some(e.to_string()),
        })?;

    let mut transfer_handler = TransferHandler::new();
    transfer_handler.handle_transfer(&mut handle, cancel_token)?;

    let status = handle.response_code().map_err(|e| {
        tracing::error!(error = %e, "Failed to get response code");
        RelayError::Network {
            message: "Failed to get response code".into(),
            cause: Some(e.to_string()),
        }
    })? as u16;

    let header_size = handle.header_size().map_err(|e| {
        tracing::error!(error = %e, "Failed to get header size");
        RelayError::Network {
            message: "Failed to get header size".into(),
            cause: Some(e.to_string()),
        }
    })?;

    let (body, headers) = transfer_handler.into_parts();

    tracing::info!(
        status = status,
        body_size = body.len(),
        header_size = header_size,
        "Request completed"
    );

    // NOTE: If this fails, something has gone very wrong.
    let status_code = StatusCode::from_u16(status).unwrap();

    ResponseHandler::new(
        id,
        headers,
        body,
        status_code,
        header_size,
        start_time,
        SystemTime::now(),
        request.version.clone(),
    )
    .build()
}

#[tracing::instrument(skip(request), fields(request_id = request.id), level = "debug")]
pub async fn execute(request: Request) -> Result<Response> {
    let request_id = request.id;

    tracing::info!(
        method = %request.method,
        url = %crate::util::redact_url(&request.url),
        "Starting request execution"
    );

    let cancel_token = CancellationToken::new();
    ACTIVE_REQUESTS.insert(request_id, cancel_token.clone());

    let thread_token = cancel_token.clone();
    let handle = std::thread::spawn(move || execute_request(&request, &thread_token));

    let result = match handle.join() {
        Ok(result) => settle(result, cancel_token.is_cancelled()),
        Err(_) => {
            tracing::error!("Request thread panicked");
            Err(RelayError::Network {
                message: "Request thread panicked".into(),
                cause: None,
            })
        }
    };

    ACTIVE_REQUESTS.remove(&request_id);
    tracing::debug!("Request execution completed");

    result
}

#[tracing::instrument(level = "debug")]
pub async fn cancel(request_id: i64) -> Result<()> {
    tracing::debug!(request_id = request_id, "Attempting to cancel request");

    if let Some(token) = ACTIVE_REQUESTS.get(&request_id) {
        token.cancel();
        tracing::info!(request_id = request_id, "Request cancelled successfully");
        Ok(())
    } else {
        tracing::warn!(
            request_id = request_id,
            "Request not found for cancellation"
        );
        Err(RelayError::Network {
            message: "Request not found".into(),
            cause: None,
        })
    }
}

/// Whether a line of curl's `InfoType::Text` output carries a secret. The
/// cookie engine writes each cookie's value, `Added cookie sid="..." for
/// domain ...`, and a redirect writes the next URL with its query string,
/// `Issue another request to this URL: '...'`.
fn logs_a_secret(line: &str) -> bool {
    line.to_ascii_lowercase().contains("cookie")
        || line.starts_with("Issue another request to this URL")
}

#[cfg(test)]
mod tests {
    use std::future::Future;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::sync::mpsc;
    use std::task::{Context, Poll, Waker};
    use std::time::{Duration, Instant};

    use http::{Method, Version};

    use super::{cancel, execute, logs_a_secret, settle};
    use crate::error::RelayError;
    use crate::interop::Request;

    // `execute` and `cancel` await nothing, so one poll runs each to the
    // end and the tests need no async runtime.
    fn run<F: Future>(future: F) -> F::Output {
        let mut future = std::pin::pin!(future);
        match future
            .as_mut()
            .poll(&mut Context::from_waker(Waker::noop()))
        {
            Poll::Ready(output) => output,
            Poll::Pending => panic!("the future awaited something"),
        }
    }

    fn get(id: i64, port: u16) -> Request {
        Request {
            id,
            url: format!("http://127.0.0.1:{port}/"),
            method: Method::GET,
            version: Version::HTTP_11,
            headers: None,
            params: None,
            content: None,
            auth: None,
            security: None,
            proxy: None,
            meta: None,
        }
    }

    // Accepts one connection, reads the request and signals `read`, then
    // answers with `reply` or holds the connection open with no answer.
    fn serve_once(reply: Option<&'static [u8]>, read: mpsc::Sender<()>) -> u16 {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let port = listener.local_addr().expect("local addr").port();
        std::thread::spawn(move || {
            let Ok((mut stream, _)) = listener.accept() else {
                return;
            };
            let mut request = [0u8; 1024];
            let _ = stream.read(&mut request);
            let _ = read.send(());
            match reply {
                Some(reply) => {
                    let _ = stream.write_all(reply);
                }
                None => std::thread::sleep(Duration::from_secs(30)),
            }
        });
        port
    }

    #[test]
    fn a_cancel_stops_a_transfer_that_has_no_answer() {
        let (read_tx, read_rx) = mpsc::channel();
        let port = serve_once(None, read_tx);
        let request = std::thread::spawn(move || run(execute(get(9_001, port))));

        read_rx
            .recv_timeout(Duration::from_secs(5))
            .expect("the request arrives");
        let cancelled_at = Instant::now();
        run(cancel(9_001)).expect("the request is active");

        let result = request.join().expect("request thread");
        assert!(
            matches!(result, Err(RelayError::Abort { .. })),
            "got {result:?}"
        );
        assert!(
            cancelled_at.elapsed() < Duration::from_secs(5),
            "the transfer ran on after the cancel"
        );
    }

    #[test]
    fn a_request_that_completed_returns_its_response() {
        let (read_tx, _read_rx) = mpsc::channel();
        let port = serve_once(
            Some(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok"),
            read_tx,
        );

        let response = run(execute(get(9_002, port))).expect("the request completes");
        assert_eq!(response.status, 200);
        assert!(
            run(cancel(9_002)).is_err(),
            "a finished request is no longer active"
        );
    }

    #[test]
    fn a_cancel_after_the_transfer_completed_keeps_the_result() {
        assert_eq!(settle(Ok(1), true).expect("completed"), 1);
    }

    #[test]
    fn a_transfer_that_failed_after_a_cancel_is_an_abort() {
        let failed: crate::error::Result<()> = Err(RelayError::Network {
            message: "Failed to perform request".into(),
            cause: None,
        });
        assert!(matches!(
            settle(failed, true),
            Err(RelayError::Abort { .. })
        ));
    }

    #[test]
    fn a_failure_without_a_cancel_keeps_its_error() {
        let failed: crate::error::Result<()> = Err(RelayError::Network {
            message: "Failed to perform request".into(),
            cause: None,
        });
        assert!(matches!(
            settle(failed, false),
            Err(RelayError::Network { .. })
        ));
    }

    #[test]
    fn a_curl_line_with_a_cookie_or_a_redirect_url_is_not_logged() {
        assert!(logs_a_secret(
            "Added cookie sid=\"abc123\" for domain example.com, path /, expire 0\n"
        ));
        assert!(logs_a_secret(
            "Replaced cookie sid=\"def\" for domain example.com, path /, expire 0\n"
        ));
        assert!(logs_a_secret(
            "Issue another request to this URL: 'https://example.com/?token=x'\n"
        ));
        assert!(!logs_a_secret(
            "Connected to example.com (93.184.215.14) port 443\n"
        ));
    }

    #[test]
    fn a_request_debug_shows_header_names_and_no_secret() {
        let mut request = get(1, 1);
        request.headers = Some(
            [("Authorization".to_string(), "Bearer s3cret".to_string())]
                .into_iter()
                .collect(),
        );
        request.auth = Some(crate::interop::AuthType::Basic {
            username: "user".into(),
            password: "hunter2".into(),
        });
        let shown = format!("{request:?}");
        assert!(shown.contains("Authorization"));
        assert!(!shown.contains("s3cret"));
        assert!(!shown.contains("hunter2"));
    }
}
