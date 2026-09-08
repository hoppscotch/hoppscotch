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
                let key_str = key.as_str();
                let value_str = value.to_str().unwrap_or("");
                tracing::debug!(
                    key = ?key_str,
                    value_count = value_str.len(),
                    value = ?value_str,
                    "Processing headers"
                );
                // A colon with no value tells libcurl to remove the header.
                // A trailing semicolon sends an explicitly empty value instead.
                let header = if value_str.is_empty() {
                    format!("{};", key_str)
                } else {
                    format!("{}: {}", key_str, value_str)
                };
                tracing::debug!(%header, "Adding header");
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn sends_empty_and_nonempty_headers_over_http() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
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
        let lines: Vec<_> = request.lines().collect();
        assert!(lines.contains(&"x-empty-header:"), "{request}");
        assert!(lines.contains(&"accept:"), "{request}");
        assert!(lines.contains(&"x-value: hello: world"), "{request}");
    }
}
