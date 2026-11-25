pub trait ToCurlVersion {
    fn to_curl_version(self) -> curl::easy::HttpVersion;
}

impl ToCurlVersion for http::Version {
    fn to_curl_version(self) -> curl::easy::HttpVersion {
        match self {
            http::Version::HTTP_10 => curl::easy::HttpVersion::V10,
            http::Version::HTTP_11 => curl::easy::HttpVersion::V11,
            http::Version::HTTP_2 => curl::easy::HttpVersion::V2,
            http::Version::HTTP_3 => curl::easy::HttpVersion::V3,
            _ => panic!("Unsupported"),
        }
    }
}

/// Returns `raw` for a log record, with the username, the password and
/// every query value replaced by `redacted`, since an API key or a token
/// is often passed in the query or the userinfo. A URL that doesn't parse
/// is logged as `<unparseable URL>`.
pub(crate) fn redact_url(raw: &str) -> String {
    let Ok(mut url) = url::Url::parse(raw) else {
        return "<unparseable URL>".to_string();
    };
    if !url.username().is_empty() {
        let _ = url.set_username("redacted");
    }
    if url.password().is_some() {
        let _ = url.set_password(Some("redacted"));
    }
    if url.query().is_some() {
        let keys: Vec<String> = url.query_pairs().map(|(key, _)| key.into_owned()).collect();
        url.query_pairs_mut()
            .clear()
            .extend_pairs(keys.iter().map(|key| (key.as_str(), "redacted")));
    }
    url.set_fragment(None);
    url.to_string()
}

#[cfg(test)]
mod tests {
    use super::redact_url;

    #[test]
    fn a_logged_url_keeps_the_query_keys_and_drops_the_values() {
        assert_eq!(
            redact_url("https://user:secret@api.example.com/v1?api_key=abc&page=2#top"),
            "https://redacted:redacted@api.example.com/v1?api_key=redacted&page=redacted"
        );
        assert_eq!(
            redact_url("https://example.com/path"),
            "https://example.com/path"
        );
        assert_eq!(redact_url("not a url"), "<unparseable URL>");
    }
}
