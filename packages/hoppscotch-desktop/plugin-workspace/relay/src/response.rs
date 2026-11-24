use std::{collections::HashMap, str::FromStr, time::SystemTime};

use bytes::Bytes;
use http::{StatusCode, Version};
use mime::Mime;
use time::{Duration, OffsetDateTime};

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

        let now = OffsetDateTime::now_utc();
        let cookies: Vec<Cookie> = raw
            .split('\n')
            .filter_map(|line| {
                let line = line.trim();
                if line.is_empty() {
                    return None;
                }
                match cookie::Cookie::parse(line) {
                    Ok(parsed) => Some(Self::to_interop_cookie(&parsed, now)),
                    Err(e) => {
                        // The cookie value is a session credential, so the
                        // record logs the cookie's name alone.
                        let name = Self::cookie_name(line);
                        tracing::warn!(error = %e, name = ?name, "Skipping unparseable Set-Cookie");
                        None
                    }
                }
            })
            .collect();

        (!cookies.is_empty()).then_some(cookies)
    }

    /// Returns the name of the `name=value` pair a `Set-Cookie` line opens
    /// with. A line whose first `;` segment has no `=` has no name, so
    /// `abc123; Path=/` returns `None` and its value isn't logged.
    fn cookie_name(line: &str) -> Option<&str> {
        line.split(';')
            .next()
            .and_then(|pair| pair.split_once('='))
            .map(|(name, _)| name.trim())
    }

    const MAX_AGE_CAP: Duration = Duration::days(400);

    fn to_interop_cookie(c: &cookie::Cookie<'_>, now: OffsetDateTime) -> Cookie {
        // RFC 6265 5.2.2, Max-Age takes precedence over Expires when both
        // are present. RFC 6265bis 5.6.2 caps Max-Age at 400 days, so an
        // absurd Max-Age can't overflow `now + age` and panic the relay, and
        // a Max-Age past the cap decides the expiry over Expires too.
        // RFC 6265 5.2.2 also expires a cookie at once when Max-Age is zero
        // or less, and an expiry equal to `now` is not yet in the past for
        // a jar that compares it to the current time, so the cookie a server
        // asked to remove would be kept. One millisecond before `now` is
        // already past.
        let expires = match c.max_age() {
            Some(age) if age <= Duration::ZERO => Some(now - Duration::milliseconds(1)),
            Some(age) => Some(now + age.min(Self::MAX_AGE_CAP)),
            None => c.expires_datetime(),
        };

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

#[cfg(test)]
mod tests {
    use time::{Duration, OffsetDateTime};

    use super::ResponseHandler;

    // 2026-01-01 12:00:00 UTC
    const NOW_UNIX: i64 = 1767268800;
    // 2031-01-01 00:00:00 UTC, the `Expires` date in the tests below
    const EXPIRES_UNIX: i64 = 1924992000;

    fn at(unix: i64) -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(unix).expect("timestamp")
    }

    fn expires(set_cookie: &str) -> Option<OffsetDateTime> {
        let parsed = cookie::Cookie::parse(set_cookie).expect("parse");
        ResponseHandler::to_interop_cookie(&parsed, at(NOW_UNIX)).expires
    }

    #[test]
    fn an_unparseable_set_cookie_logs_the_name_alone() {
        assert_eq!(
            ResponseHandler::cookie_name("sid=abc123; Path=/"),
            Some("sid")
        );
        assert_eq!(ResponseHandler::cookie_name("abc123; Path=/"), None);
    }

    #[test]
    fn a_zero_max_age_expires_before_now() {
        assert_eq!(
            expires("session=; Max-Age=0"),
            Some(at(NOW_UNIX) - Duration::milliseconds(1))
        );
    }

    #[test]
    fn a_negative_max_age_expires_before_now() {
        assert_eq!(
            expires("session=; Max-Age=-1"),
            Some(at(NOW_UNIX) - Duration::milliseconds(1))
        );
    }

    #[test]
    fn a_positive_max_age_counts_from_now() {
        assert_eq!(
            expires("session=abc; Max-Age=60"),
            Some(at(NOW_UNIX) + Duration::seconds(60))
        );
    }

    #[test]
    fn a_huge_max_age_is_capped_and_wins_over_expires() {
        assert_eq!(
            expires(
                "session=abc; Max-Age=9223372036854775807; Expires=Wed, 01 Jan 2031 00:00:00 GMT"
            ),
            Some(at(NOW_UNIX) + Duration::days(400))
        );
    }

    #[test]
    fn max_age_takes_precedence_over_expires() {
        assert_eq!(
            expires("session=; Max-Age=0; Expires=Wed, 01 Jan 2031 00:00:00 GMT"),
            Some(at(NOW_UNIX) - Duration::milliseconds(1))
        );
    }

    #[test]
    fn expires_applies_without_max_age() {
        assert_eq!(
            expires("session=abc; Expires=Wed, 01 Jan 2031 00:00:00 GMT"),
            Some(at(EXPIRES_UNIX))
        );
    }
}
