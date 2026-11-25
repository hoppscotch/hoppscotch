use std::{collections::HashMap, str::FromStr, time::SystemTime};

use bytes::Bytes;
use http::{StatusCode, Version};
use mime::Mime;
use time::OffsetDateTime;

use crate::{
    error::{RelayError, Result},
    interop::{
        Cookie, MediaType, Response, ResponseBody, ResponseMeta, SameSite, SizeInfo, TimingInfo,
    },
};

pub(crate) struct ResponseHandler {
    id: i64,
    headers: HashMap<String, String>,
    body: Bytes,
    status: StatusCode,
    header_size: u64,
    start_time: SystemTime,
    end_time: SystemTime,
    version: Version,
}

impl ResponseHandler {
    pub(crate) fn new(
        id: i64,
        headers: HashMap<String, String>,
        body: Bytes,
        status: StatusCode,
        header_size: u64,
        start_time: SystemTime,
        end_time: SystemTime,
        version: Version,
    ) -> Self {
        Self {
            id,
            headers,
            body,
            status,
            header_size,
            start_time,
            end_time,
            version,
        }
    }

    #[tracing::instrument(skip(self), fields(request_id = self.id), level = "debug")]
    pub(crate) fn build(self) -> Result<Response> {
        tracing::debug!(status = %self.status, "Building response");
        let media_type = self.determine_media_type();
        let timing = self.calculate_timing()?;
        let size = SizeInfo {
            headers: self.header_size,
            body: self.body.len() as u64,
            total: self.header_size + self.body.len() as u64,
        };

        tracing::debug!(
            status = ?self.status,
            media_type = ?media_type,
            body_size = size.body,
            total_size = size.total,
            version = ?self.version,
            "Response built successfully"
        );

        let cookies = self.parse_cookies();

        let body = ResponseBody {
            body: self.body,
            media_type,
        };

        Ok(Response {
            id: self.id,
            status: self.status,
            status_text: self.status.to_string(),
            version: self.version,
            cookies,
            headers: self.headers,
            meta: ResponseMeta { timing, size },
            body,
        })
    }

    /// Parses the response's `Set-Cookie` header(s) into structured cookies.
    ///
    /// The relay used to return `cookies: None` because nothing downstream
    /// consumed structured cookies, and `transfer.rs` joins multiple
    /// `Set-Cookie` headers into one value with `\n`. This splits on that
    /// same delimiter and parses each line with the `cookie` crate so the
    /// jar service gets a real contract instead of re-parsing the joined
    /// header string. The joined header is left in `headers` untouched so
    /// the existing header path does not regress.
    fn parse_cookies(&self) -> Option<Vec<Cookie>> {
        let raw = self
            .headers
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("set-cookie"))
            .map(|(_, v)| v.as_str())?;

        let cookies: Vec<Cookie> = raw
            .split('\n')
            .filter_map(|line| {
                let line = line.trim();
                if line.is_empty() {
                    return None;
                }
                match cookie::Cookie::parse(line) {
                    Ok(parsed) => Some(Self::to_interop_cookie(&parsed)),
                    Err(e) => {
                        tracing::warn!(error = %e, raw = %line, "Skipping unparseable Set-Cookie");
                        None
                    }
                }
            })
            .collect();

        (!cookies.is_empty()).then_some(cookies)
    }

    fn to_interop_cookie(c: &cookie::Cookie<'_>) -> Cookie {
        // RFC 6265 5.2.2, Max-Age takes precedence over Expires when both
        // are present. `checked_add` so an absurd Max-Age cannot panic the
        // relay, it just drops the expiry and the cookie reads as session.
        let expires = c
            .max_age()
            .and_then(|age| OffsetDateTime::now_utc().checked_add(age))
            .or_else(|| c.expires_datetime());

        let same_site = c.same_site().map(|s| match s {
            cookie::SameSite::Strict => SameSite::Strict,
            cookie::SameSite::Lax => SameSite::Lax,
            cookie::SameSite::None => SameSite::None,
        });

        Cookie {
            name: c.name().to_owned(),
            value: c.value().to_owned(),
            domain: c.domain().map(str::to_owned),
            path: c.path().map(str::to_owned),
            expires,
            secure: c.secure(),
            http_only: c.http_only(),
            same_site,
        }
    }

    fn determine_media_type(&self) -> MediaType {
        tracing::trace!("Determining response content type");

        self.headers
            .iter()
            .find_map(|(k, v)| {
                if k.to_lowercase() == "content-type" {
                    v.parse::<Mime>()
                        .ok()
                        .and_then(|mime| match (mime.type_(), mime.subtype()) {
                            (mime::APPLICATION, mime::JSON) => Some(MediaType::Json),
                            (mime::APPLICATION, mime::XML) => Some(MediaType::Xml),
                            (mime::APPLICATION, mime::OCTET_STREAM) => Some(MediaType::OctetStream),
                            (mime::TEXT, mime::PLAIN) => Some(MediaType::TextPlain),
                            (mime::TEXT, mime::HTML) => Some(MediaType::TextHtml),
                            (mime::TEXT, mime::CSS) => Some(MediaType::TextCss),
                            (mime::TEXT, mime::CSV) => Some(MediaType::TextCsv),
                            (mime::TEXT, mime::XML) => Some(MediaType::TextXml),
                            (mime::APPLICATION, mime::WWW_FORM_URLENCODED) => {
                                Some(MediaType::FormUrlEncoded)
                            }
                            (mime::APPLICATION, name) if name == "ld+json" => {
                                Some(MediaType::JsonLd)
                            }
                            (mime::MULTIPART, name) if name == "form-data" => {
                                Some(MediaType::MultipartFormData)
                            }
                            _ => None,
                        })
                } else {
                    None
                }
            })
            .or(infer::get(&self.body)
                .map(|kind| MediaType::from_str(kind.mime_type()).ok())
                .flatten())
            .unwrap_or(MediaType::TextPlain)
    }

    fn calculate_timing(&self) -> Result<TimingInfo> {
        let start_ms = self
            .start_time
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to get start time");
                RelayError::Parse {
                    message: "Failed to get start time".into(),
                    cause: Some(e.to_string()),
                }
            })?
            .as_millis() as u64;

        let end_ms = self
            .end_time
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to get end time");
                RelayError::Parse {
                    message: "Failed to get end time".into(),
                    cause: Some(e.to_string()),
                }
            })?
            .as_millis() as u64;

        tracing::trace!(
            start_ms = start_ms,
            end_ms = end_ms,
            duration_ms = end_ms - start_ms,
            "Calculated request timing"
        );

        Ok(TimingInfo {
            start: start_ms,
            end: end_ms,
        })
    }
}
