use std::collections::HashMap;
use std::str::FromStr;

use curl::easy::{Easy, List};
use http::{HeaderMap, HeaderName, HeaderValue};

use crate::error::{RelayError, Result};

pub(crate) struct HeadersBuilder<'a> {
    handle: &'a mut Easy,
}

impl<'a> HeadersBuilder<'a> {
    pub(crate) fn new(handle: &'a mut Easy) -> Self {
        Self { handle }
    }

    #[tracing::instrument(skip(self), level = "debug")]
    pub(crate) fn add_headers(&mut self, headers: Option<&HashMap<String, String>>) -> Result<()> {
        let Some(headers) = headers else {
            tracing::debug!("No headers provided");
            return Ok(());
        };

        let mut header_map = HeaderMap::new();
        for (key, value) in headers {
            if let (Ok(name), Ok(val)) = (HeaderName::from_str(key), HeaderValue::from_str(value)) {
                header_map.insert(name, val);
            }
        }

        let header_count = header_map.len();
        tracing::info!(header_count, "Building header list");

        let list = header_map
            .iter()
            .map(|(key, value)| {
                tracing::debug!(
                    key = ?key.as_str(),
                    value_count = value.as_bytes().len(),
                    "Processing headers"
                );
                let header = header_entry(key, value);
                tracing::debug!(header = ?header, "Adding header");
                header
            })
            .try_fold(List::new(), |mut list, header| {
                list.append(&header).map_err(|e| {
                    tracing::error!(%e, "Failed to append header: {header}");
                    RelayError::Network {
                        message: format!("Failed to append header: {header}"),
                        cause: Some(e.to_string()),
                    }
                })?;
                Ok(list)
            })?;

        self.handle.http_headers(list).map_err(|e| {
            tracing::error!(%e, "Failed to set headers");
            RelayError::Network {
                message: "Failed to set headers".into(),
                cause: Some(e.to_string()),
            }
        })
    }
}

/// Builds the libcurl header list entry for a header/value pair.
///
/// libcurl interprets `Name: ` with no value as an instruction to remove the
/// header, and `Name;` as an explicitly empty value. Emptiness must be decided
/// from the raw value bytes, not from a string conversion: `to_str()` fails
/// for non-UTF-8 values and would otherwise turn a nonempty value into `Name;`.
/// The curl binding only accepts UTF-8 strings, so non-UTF-8 values are
/// forwarded via a lossy conversion instead of being dropped or emptied.
fn header_entry(key: &HeaderName, value: &HeaderValue) -> String {
    if value.as_bytes().is_empty() {
        format!("{};", key.as_str())
    } else {
        format!(
            "{}: {}",
            key.as_str(),
            String::from_utf8_lossy(value.as_bytes())
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{ErrorKind, Read, Write};
    use std::net::TcpListener;
    use std::thread;
    use std::time::{Duration, Instant};

    #[test]
    fn empty_value_uses_semicolon_syntax() {
        let key = HeaderName::from_str("x-test").unwrap();
        let value = HeaderValue::from_bytes(b"").unwrap();
        assert_eq!(header_entry(&key, &value), "x-test;");
    }

    #[test]
    fn nonempty_ascii_value_keeps_colon_format() {
        let key = HeaderName::from_str("x-test").unwrap();
        let value = HeaderValue::from_str("hello").unwrap();
        assert_eq!(header_entry(&key, &value), "x-test: hello");
    }

    #[test]
    fn value_containing_colon_is_not_treated_as_empty() {
        let key = HeaderName::from_str("x-test").unwrap();
        let value = HeaderValue::from_str("abc:def").unwrap();
        assert_eq!(header_entry(&key, &value), "x-test: abc:def");
    }

    #[test]
    fn non_utf8_value_is_not_treated_as_empty() {
        let key = HeaderName::from_str("x-test").unwrap();
        let value = HeaderValue::from_bytes(b"hello \xFF world").unwrap();
        let entry = header_entry(&key, &value);
        assert!(entry.starts_with("x-test: "), "unexpected entry: {entry}");
        assert_ne!(entry, "x-test;");
    }

    #[test]
    fn sends_empty_and_nonempty_headers_over_http() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        listener.set_nonblocking(true).unwrap();
        let server = thread::spawn(move || {
            let deadline = Instant::now() + Duration::from_secs(5);
            let (mut stream, _) = loop {
                match listener.accept() {
                    Ok(connection) => break connection,
                    Err(error) if error.kind() == ErrorKind::WouldBlock => {
                        assert!(Instant::now() < deadline, "timed out waiting for client");
                        thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("accept failed: {error}"),
                }
            };
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let mut request = Vec::new();
            let mut buffer = [0; 1024];
            while !request.windows(4).any(|bytes| bytes == b"\r\n\r\n") {
                let count = stream.read(&mut buffer).unwrap();
                assert_ne!(count, 0, "connection closed before request headers");
                request.extend_from_slice(&buffer[..count]);
            }
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                .unwrap();
            String::from_utf8(request).unwrap()
        });

        let mut handle = Easy::new();
        handle.url(&format!("http://{address}/")).unwrap();
        handle.proxy("").unwrap();
        handle.timeout(Duration::from_secs(5)).unwrap();
        let headers = HashMap::from([
            ("X-Empty-Header".to_owned(), String::new()),
            ("Accept".to_owned(), String::new()),
            ("X-Value".to_owned(), "hello: world".to_owned()),
        ]);
        HeadersBuilder::new(&mut handle)
            .add_headers(Some(&headers))
            .unwrap();
        handle.perform().unwrap();

        let request = server.join().unwrap();
        for (name, value) in [
            ("x-empty-header", ""),
            ("accept", ""),
            ("x-value", "hello: world"),
        ] {
            assert!(
                request
                    .lines()
                    .filter_map(|line| line.split_once(':'))
                    .any(|(key, actual)| key.trim().eq_ignore_ascii_case(name)
                        && actual.trim() == value),
                "{request}"
            );
        }
    }
}
