use std::collections::HashMap;

use bytes::{Bytes, BytesMut};
use curl::easy::Easy;
use tokio_util::sync::CancellationToken;

use crate::error::{RelayError, Result};

// curl calls the header callback for every response in the chain, the
// redirects, a `100 Continue` and a proxy `CONNECT` reply included, and
// each response opens with its status line. Clearing the map at that
// line lets the final response's `Content-Type` and `Location` decide
// the result. `Set-Cookie` is kept across the clear, since a login that
// answers with a redirect sets its session cookie on that redirect and
// the jar has to store it.
fn record_header(headers: &mut HashMap<String, String>, line: &[u8]) {
    let Ok(line) = std::str::from_utf8(line) else {
        return;
    };

    if line.starts_with("HTTP/") {
        headers.retain(|key, _| key.eq_ignore_ascii_case("set-cookie"));
        return;
    }

    let Some((key, value)) = line.split_once(':') else {
        return;
    };
    let key = key.trim();
    let value = value.trim().to_string();

    if key.eq_ignore_ascii_case("set-cookie") {
        // NOTE: Special handling workaround.
        // Concatenate multiple `Set-Cookie` headers.
        // Matched without case, so a redirect that sends `Set-Cookie` and a
        // final response that sends `set-cookie` add to one entry, which is
        // the one `ResponseHandler::parse_cookies` reads.
        match headers
            .iter_mut()
            .find(|(existing, _)| existing.eq_ignore_ascii_case("set-cookie"))
        {
            Some((_, existing)) => {
                existing.push('\n');
                existing.push_str(&value);
            }
            None => {
                headers.insert(key.to_string(), value);
            }
        }
    } else {
        headers.entry(key.to_string()).or_insert(value);
    }
}

pub(crate) struct TransferHandler {
    body: BytesMut,
    headers: HashMap<String, String>,
}

impl TransferHandler {
    pub(crate) fn new() -> Self {
        Self {
            body: BytesMut::new(),
            headers: HashMap::new(),
        }
    }

    #[tracing::instrument(skip(self, handle), level = "debug")]
    pub(crate) fn handle_transfer(
        &mut self,
        handle: &mut Easy,
        cancel_token: &CancellationToken,
    ) -> Result<()> {
        tracing::debug!("Setting up transfer handlers");

        // curl calls the progress callback only once progress meters are
        // switched on, and that callback is the one point during `perform`
        // where a cancel can stop the transfer. curl calls it about once a
        // second even while no data arrives, so a cancel also stops a
        // request whose server never answers.
        handle.progress(true).map_err(|e| {
            tracing::error!(error = %e, "Failed to enable progress callback");
            RelayError::Network {
                message: "Failed to enable progress callback".into(),
                cause: Some(e.to_string()),
            }
        })?;

        let mut transfer = handle.transfer();

        let body = &mut self.body;
        let headers = &mut self.headers;

        transfer
            .write_function(move |data| {
                body.extend_from_slice(data);
                tracing::trace!(bytes = data.len(), "Received response data chunk");
                Ok(data.len())
            })
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to set write callback");
                RelayError::Network {
                    message: "Failed to set write callback".into(),
                    cause: Some(e.to_string()),
                }
            })?;

        transfer
            .header_function(move |header| {
                record_header(headers, header);
                true
            })
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to set header callback");
                RelayError::Network {
                    message: "Failed to set header callback".into(),
                    cause: Some(e.to_string()),
                }
            })?;

        transfer
            .progress_function(|_, _, _, _| {
                let cancelled = cancel_token.is_cancelled();
                if cancelled {
                    tracing::warn!("Request cancelled by user");
                }
                !cancelled
            })
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to set progress callback");
                RelayError::Network {
                    message: "Failed to set progress callback".into(),
                    cause: Some(e.to_string()),
                }
            })?;

        tracing::debug!("Starting transfer");
        transfer.perform().map_err(|e| {
            tracing::error!(error = %e, "Failed to perform request");
            RelayError::Network {
                message: "Failed to perform request".into(),
                cause: Some(e.to_string()),
            }
        })?;

        tracing::debug!("Transfer completed successfully");
        Ok(())
    }

    pub(crate) fn into_parts(self) -> (Bytes, HashMap<String, String>) {
        (self.body.into(), self.headers)
    }
}

#[cfg(test)]
mod tests {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    use std::thread;

    use super::*;

    fn record_all(lines: &[&str]) -> HashMap<String, String> {
        let mut headers = HashMap::new();
        for line in lines {
            record_header(&mut headers, line.as_bytes());
        }
        headers
    }

    #[test]
    fn a_status_line_drops_the_previous_response_headers() {
        let headers = record_all(&[
            "HTTP/1.1 302 Found\r\n",
            "location: /final\r\n",
            "content-type: text/html\r\n",
            "x-hop: redirect\r\n",
            "\r\n",
            "HTTP/1.1 200 OK\r\n",
            "content-type: application/json\r\n",
            "\r\n",
        ]);
        assert_eq!(
            headers.get("content-type").map(String::as_str),
            Some("application/json")
        );
        assert_eq!(headers.get("x-hop"), None);
        assert_eq!(headers.get("location"), None);
    }

    #[test]
    fn a_cookie_set_on_a_redirect_survives_the_final_response() {
        let headers = record_all(&[
            "HTTP/1.1 302 Found\r\n",
            "Set-Cookie: session=abc\r\n",
            "\r\n",
            "HTTP/2 200\r\n",
            "set-cookie: final=1\r\n",
            "\r\n",
        ]);
        let cookies: Vec<&String> = headers
            .iter()
            .filter(|(key, _)| key.eq_ignore_ascii_case("set-cookie"))
            .map(|(_, value)| value)
            .collect();
        assert_eq!(cookies, vec!["session=abc\nfinal=1"]);
    }

    #[test]
    fn a_repeated_header_in_one_response_keeps_its_first_value() {
        let headers = record_all(&["HTTP/1.1 200 OK\r\n", "x-a: 1\r\n", "x-a: 2\r\n"]);
        assert_eq!(headers.get("x-a").map(String::as_str), Some("1"));
    }

    /// Serves `/redirect` as a 302 to `/final`, closing the connection after each response.
    fn redirect_server() -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        thread::spawn(move || {
            for stream in listener.incoming().take(2) {
                let mut stream = stream.unwrap();
                let mut request_line = String::new();
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                reader.read_line(&mut request_line).unwrap();
                loop {
                    let mut line = String::new();
                    reader.read_line(&mut line).unwrap();
                    if line.trim().is_empty() {
                        break;
                    }
                }
                let response = if request_line.contains("/redirect") {
                    "HTTP/1.1 302 Found\r\nlocation: /final\r\ncontent-type: text/html\r\nx-hop: redirect\r\nset-cookie: hop=1\r\ncontent-length: 0\r\nconnection: close\r\n\r\n"
                } else {
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\nset-cookie: final=1\r\ncontent-length: 2\r\nconnection: close\r\n\r\n{}"
                };
                stream.write_all(response.as_bytes()).unwrap();
            }
        });
        base
    }

    #[test]
    fn headers_come_from_the_final_response_after_a_redirect() {
        let base = redirect_server();
        let mut handle = Easy::new();
        handle.url(&format!("{base}/redirect")).unwrap();
        handle.follow_location(true).unwrap();

        let mut transfer = TransferHandler::new();
        transfer
            .handle_transfer(&mut handle, &CancellationToken::new())
            .unwrap();
        let (body, headers) = transfer.into_parts();

        assert_eq!(handle.response_code().unwrap(), 200);
        assert_eq!(&body[..], b"{}");
        assert_eq!(
            headers.get("content-type").map(String::as_str),
            Some("application/json")
        );
        assert_eq!(headers.get("content-length").map(String::as_str), Some("2"));
        assert_eq!(headers.get("x-hop"), None);
        assert_eq!(
            headers.get("set-cookie").map(String::as_str),
            Some("hop=1\nfinal=1")
        );
    }
}
