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

pub(crate) fn curl_version_for_url(
    version: http::Version,
    url: &str,
    is_grpc: bool,
) -> curl::easy::HttpVersion {
    // Native cleartext HTTP/2 services (notably gRPC) expect the HTTP/2
    // connection preface directly and generally do not implement the
    // HTTP/1.1 h2c upgrade dance used by CURL_HTTP_VERSION_2_0.
    let is_cleartext = url
        .get(..7)
        .is_some_and(|scheme| scheme.eq_ignore_ascii_case("http://"));

    if version == http::Version::HTTP_2 && is_cleartext && is_grpc {
        curl::easy::HttpVersion::V2PriorKnowledge
    } else {
        version.to_curl_version()
    }
}

#[cfg(test)]
mod tests {
    use super::curl_version_for_url;
    use curl::easy::HttpVersion;

    #[test]
    fn uses_prior_knowledge_for_cleartext_grpc() {
        let version = curl_version_for_url(http::Version::HTTP_2, "http://localhost:8080", true);
        assert_eq!(version as isize, HttpVersion::V2PriorKnowledge as isize);
    }

    #[test]
    fn uses_prior_knowledge_for_case_insensitive_cleartext_grpc_scheme() {
        let version = curl_version_for_url(http::Version::HTTP_2, "HTTP://localhost:8080", true);
        assert_eq!(version as isize, HttpVersion::V2PriorKnowledge as isize);
    }

    #[test]
    fn uses_negotiated_http2_for_cleartext_non_grpc() {
        let version = curl_version_for_url(http::Version::HTTP_2, "http://localhost:8080", false);
        assert_eq!(version as isize, HttpVersion::V2 as isize);
    }

    #[test]
    fn uses_negotiated_http2_for_tls() {
        let version = curl_version_for_url(http::Version::HTTP_2, "https://example.com", true);
        assert_eq!(version as isize, HttpVersion::V2 as isize);
    }

    #[test]
    fn leaves_other_http_versions_unchanged() {
        let version = curl_version_for_url(http::Version::HTTP_11, "http://localhost:8080", true);
        assert_eq!(version as isize, HttpVersion::V11 as isize);
    }
}
