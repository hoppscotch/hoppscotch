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
                let header = format!("{}: {}", key_str, value_str);
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
