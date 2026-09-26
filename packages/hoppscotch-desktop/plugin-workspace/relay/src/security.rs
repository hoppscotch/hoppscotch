use std::sync::OnceLock;

use bytes::Bytes;
use curl::easy::Easy;

use openssl::pkcs12::Pkcs12;

use crate::{
    error::{RelayError, Result},
    interop::{CertificateConfig, CertificateType, SecurityConfig},
    trust::{self, TrustBundle},
};

// Read once per process, since reading the keychain or enumerating the Windows
// stores is too slow to repeat on every request. The info record below is the
// only log line naming which trust source supplied the anchors, so it is
// written once at init with the source and the anchor counts.
static TRUST: OnceLock<TrustBundle> = OnceLock::new();

fn trust_bundle() -> &'static TrustBundle {
    TRUST.get_or_init(|| {
        let bundle = trust::load();
        if matches!(bundle.source, trust::TrustSource::Bundled) {
            tracing::warn!(
                anchors = bundle.retained,
                "Host trust store unread, using the bundled roots"
            );
        } else {
            tracing::info!(
                source = bundle.source.as_str(),
                anchors_read = bundle.read,
                anchors = bundle.retained,
                "Resolved TLS trust store"
            );
        }
        bundle
    })
}

fn system_ca_bundle() -> &'static [u8] {
    trust_bundle().pem.as_slice()
}

// `CURLOPT_CAINFO_BLOB` replaces its previous value on every call and overrides
// `CURLOPT_CAINFO`, so setting one blob per cert would keep only the last cert
// and drop the system trust store as well. Concatenating the system anchors
// first and the user CAs after them into one blob, set once, extends the host
// store with every user CA.
fn combine_ca_bundle(system: &[u8], user: &[Bytes]) -> Vec<u8> {
    let mut combined: Vec<u8> = Vec::with_capacity(system.len() + 4096);
    combined.extend_from_slice(system);
    if !system.is_empty() && !combined.ends_with(b"\n") {
        combined.push(b'\n');
    }
    // Each user entry is re-encoded from the blocks that parsed, ∵ OpenSSL
    // reads the blob as a whole and a malformed block anywhere in it discards
    // the certificates already read, which would take the host anchors down
    // with the entry that carried the bad block.
    for cert in user {
        combined.extend_from_slice(&trust::normalize_pem(cert));
        if !combined.ends_with(b"\n") {
            combined.push(b'\n');
        }
    }
    combined
}

pub(crate) struct SecurityHandler<'a> {
    handle: &'a mut Easy,
}

impl<'a> SecurityHandler<'a> {
    pub(crate) fn new(handle: &'a mut Easy) -> Self {
        Self { handle }
    }

    #[tracing::instrument(skip(self), level = "debug")]
    /// Sets the host anchors with no user CA, for a request that carries no
    /// security settings of its own.
    pub(crate) fn configure_host_trust(&mut self) -> Result<()> {
        self.configure_ca_certificates(&[])
    }

    pub(crate) fn configure(&mut self, security: &SecurityConfig) -> Result<()> {
        tracing::info!("Configuring security settings");

        if let Some(verify) = security.verify_peer {
            tracing::debug!(verify = verify, "Setting SSL verify peer");
            self.handle.ssl_verify_peer(verify).map_err(|e| {
                tracing::error!(error = %e, "Failed to set SSL verify peer");
                RelayError::Certificate {
                    message: "Failed to set SSL verify peer".into(),
                    cause: Some(e.to_string()),
                }
            })?;
        }

        if let Some(verify) = security.verify_host {
            tracing::debug!(verify = verify, "Setting SSL verify host");
            self.handle.ssl_verify_host(verify).map_err(|e| {
                tracing::error!(error = %e, "Failed to set SSL verify host");
                RelayError::Certificate {
                    message: "Failed to set SSL verify host".into(),
                    cause: Some(e.to_string()),
                }
            })?;
        }

        if let Some(ref certs) = security.certificates {
            self.configure_certificates(certs)?;
        }

        // Applied on every request, since every request validates against the
        // host store and curl reads that store only through the probe, which
        // finds a usable file on Linux alone.
        let user_cas = security
            .certificates
            .as_ref()
            .and_then(|certs| certs.ca.as_deref())
            .unwrap_or(&[]);
        self.configure_ca_certificates(user_cas)?;

        tracing::debug!("Security configuration complete");
        Ok(())
    }

    #[tracing::instrument(skip(self), level = "debug")]
    fn configure_certificates(&mut self, certs: &CertificateConfig) -> Result<()> {
        if let Some(ref client_cert) = certs.client {
            match client_cert {
                CertificateType::Pem { cert, key } => {
                    tracing::info!("Configuring PEM certificate");
                    self.configure_pem_certificate(cert, key)?;
                }
                CertificateType::Pfx { data, password } => {
                    tracing::info!("Configuring PKCS#12 certificate");
                    self.configure_pfx_certificate(data, password)?;
                }
            }
        }

        Ok(())
    }

    fn configure_pem_certificate(&mut self, cert: &[u8], key: &[u8]) -> Result<()> {
        tracing::debug!("Setting PEM certificate type");
        self.handle.ssl_cert_type("PEM").map_err(|e| {
            tracing::error!(error = %e, "Failed to set certificate type");
            RelayError::Certificate {
                message: "Failed to set certificate type".into(),
                cause: Some(e.to_string()),
            }
        })?;

        tracing::debug!("Setting PEM certificate data");
        self.handle.ssl_cert_blob(cert).map_err(|e| {
            tracing::error!(error = %e, "Failed to set client certificate");
            RelayError::Certificate {
                message: "Failed to set client certificate".into(),
                cause: Some(e.to_string()),
            }
        })?;

        tracing::debug!("Setting PEM key type");
        self.handle.ssl_key_type("PEM").map_err(|e| {
            tracing::error!(error = %e, "Failed to set key type");
            RelayError::Certificate {
                message: "Failed to set key type".into(),
                cause: Some(e.to_string()),
            }
        })?;

        tracing::debug!("Setting PEM key data");
        self.handle.ssl_key_blob(key).map_err(|e| {
            tracing::error!(error = %e, "Failed to set client key");
            RelayError::Certificate {
                message: "Failed to set client key".into(),
                cause: Some(e.to_string()),
            }
        })?;

        Ok(())
    }

    fn configure_pfx_certificate(&mut self, data: &[u8], password: &str) -> Result<()> {
        let pkcs12 = Pkcs12::from_der(data).map_err(|e| {
            tracing::error!(error = %e, "Failed to parse PKCS#12 data");
            RelayError::Certificate {
                message: "Failed to parse PKCS#12 data".into(),
                cause: Some(e.to_string()),
            }
        })?;

        let parsed = pkcs12.parse2(password).map_err(|e| {
            tracing::error!(error = %e, "Failed to parse PKCS#12 password");
            RelayError::Certificate {
                message: "Failed to parse the PKCS#12 bundle".into(),
                cause: Some(e.to_string()),
            }
        })?;

        if let (Some(cert), Some(key)) = (parsed.cert, parsed.pkey) {
            let cert_pem = cert.to_pem().map_err(|e| {
                tracing::error!(error = %e, "Failed to convert certificate to PEM");
                RelayError::Certificate {
                    message: "Failed to convert certificate to PEM".into(),
                    cause: Some(e.to_string()),
                }
            })?;

            let key_pem = key.private_key_to_pem_pkcs8().map_err(|e| {
                tracing::error!(error = %e, "Failed to convert private key to PEM");
                RelayError::Certificate {
                    message: "Failed to convert private key to PEM".into(),
                    cause: Some(e.to_string()),
                }
            })?;

            self.configure_pem_certificate(&cert_pem, &key_pem)
        } else {
            tracing::error!("PKCS#12 file missing certificate or private key");
            Err(RelayError::Certificate {
                message: "PKCS#12 file missing certificate or private key".into(),
                cause: None,
            })
        }
    }

    fn configure_ca_certificates(&mut self, ca_certs: &[Bytes]) -> Result<()> {
        // Checked before the concatenation, since OpenSSL skips an entry that
        // is not PEM without reporting it, and the user who pasted that entry
        // would see only a handshake failure.
        for (index, cert) in ca_certs.iter().enumerate() {
            if !trust::parses_as_pem(cert) {
                tracing::error!(cert_index = index, "CA certificate is not valid PEM");
                return Err(RelayError::Certificate {
                    message: format!("CA certificate at index {index} is not valid PEM"),
                    cause: None,
                });
            }
        }

        let combined = combine_ca_bundle(system_ca_bundle(), ca_certs);
        if combined.is_empty() {
            tracing::debug!("No CA anchors resolved, leaving curl's own trust configuration");
            return Ok(());
        }

        if !ca_certs.is_empty() {
            tracing::debug!(
                user_certs = ca_certs.len(),
                "Extending the trust store with user CA certificates"
            );
        }

        self.handle.ssl_cainfo_blob(&combined).map_err(|e| {
            tracing::error!(error = %e, "Failed to set combined CA bundle");
            RelayError::Certificate {
                message: "Failed to set combined CA bundle".into(),
                cause: Some(e.to_string()),
            }
        })?;

        // `CURLOPT_CAINFO_BLOB` covers the origin connection, and libcurl
        // verifies an HTTPS proxy against its own CA setting, so a proxy whose
        // certificate chains to a host anchor would otherwise fail the CONNECT
        // with nothing the user can configure.
        self.handle.proxy_ssl_cainfo_blob(&combined).map_err(|e| {
            tracing::error!(error = %e, "Failed to set combined CA bundle for the proxy");
            RelayError::Certificate {
                message: "Failed to set combined CA bundle for the proxy".into(),
                cause: Some(e.to_string()),
            }
        })?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{combine_ca_bundle, SecurityHandler};
    use crate::interop::{CertificateConfig, SecurityConfig};
    use bytes::Bytes;
    use curl::easy::Easy;
    use openssl::asn1::Asn1Time;
    use openssl::hash::MessageDigest;
    use openssl::pkey::PKey;
    use openssl::rsa::Rsa;
    use openssl::x509::{X509Name, X509};

    // A real certificate, ∵ `combine_ca_bundle` re-encodes each user entry
    // from the blocks that parse and a placeholder string parses as nothing.
    fn cert(cn: &str) -> Bytes {
        let key = PKey::from_rsa(Rsa::generate(2048).expect("rsa")).expect("pkey");
        let mut name = X509Name::builder().expect("name builder");
        name.append_entry_by_text("CN", cn).expect("cn");
        let name = name.build();

        let mut builder = X509::builder().expect("cert builder");
        builder.set_version(2).expect("version");
        builder.set_subject_name(&name).expect("subject");
        builder.set_issuer_name(&name).expect("issuer");
        builder.set_pubkey(&key).expect("pubkey");
        builder
            .set_not_before(&Asn1Time::days_from_now(0).expect("now"))
            .expect("not before");
        builder
            .set_not_after(&Asn1Time::days_from_now(365).expect("year"))
            .expect("not after");
        builder.sign(&key, MessageDigest::sha256()).expect("sign");
        Bytes::from(builder.build().to_pem().expect("pem"))
    }

    fn anchors(blob: &[u8]) -> usize {
        blob.windows(27)
            .filter(|window| *window == b"-----BEGIN CERTIFICATE-----")
            .count()
    }

    #[test]
    fn an_empty_user_list_returns_the_system_bundle_unchanged() {
        assert_eq!(combine_ca_bundle(b"sys\n", &[]), b"sys\n".to_vec());
    }

    #[test]
    fn a_system_bundle_without_a_trailing_newline_gains_one() {
        assert_eq!(combine_ca_bundle(b"sys", &[]), b"sys\n".to_vec());
    }

    #[test]
    fn an_empty_system_bundle_returns_the_user_certs_alone() {
        let user = cert("alone");
        assert_eq!(combine_ca_bundle(b"", &[user.clone()]), user.to_vec());
    }

    #[test]
    fn both_empty_returns_an_empty_blob() {
        assert!(combine_ca_bundle(b"", &[]).is_empty());
    }

    #[test]
    fn the_system_anchors_precede_the_user_certs() {
        let system = cert("system");
        let user = cert("user");
        let blob = combine_ca_bundle(&system, &[user.clone()]);
        assert!(blob.starts_with(&system));
        assert!(blob.ends_with(&user));
        assert_eq!(anchors(&blob), 2);
    }

    // One `ssl_cainfo_blob` call per cert keeps only the last cert, so this
    // asserts that every user CA is in the combined blob.
    #[test]
    fn every_user_cert_is_in_the_blob() {
        let system = cert("system");
        let user = [cert("one"), cert("two"), cert("three")];
        let blob = combine_ca_bundle(&system, &user);
        for entry in &user {
            assert!(
                blob.windows(entry.len()).any(|window| window == &entry[..]),
                "a user certificate is missing from the combined blob"
            );
        }
        assert_eq!(anchors(&blob), 4);
    }

    // The lenient check accepts an entry whose blocks parse in part, and the
    // blob OpenSSL reads is all-or-nothing, so the entry reaches it as the
    // certificates that parsed and the corrupt block is left behind.
    #[test]
    fn a_user_entry_with_a_corrupt_block_keeps_its_certificate() {
        let good = cert("good");
        let mut mixed = good.to_vec();
        mixed.extend_from_slice(
            b"-----BEGIN CERTIFICATE-----\ntruncated\n-----END CERTIFICATE-----\n",
        );
        let blob = combine_ca_bundle(b"", &[Bytes::from(mixed)]);
        assert_eq!(blob, good.to_vec());
        assert_eq!(anchors(&blob), 1);
    }

    fn perform(url: &str, ca: Option<Vec<Bytes>>) -> u32 {
        let mut handle = Easy::new();
        handle.url(url).expect("url");
        handle.write_function(|data| Ok(data.len())).expect("sink");
        SecurityHandler::new(&mut handle)
            .configure(&SecurityConfig {
                certificates: ca.map(|ca| CertificateConfig {
                    client: None,
                    ca: Some(ca),
                }),
                verify_host: Some(true),
                verify_peer: Some(true),
            })
            .expect("configure");
        handle.perform().expect("perform");
        handle.response_code().expect("response code")
    }

    // Makes a network request, so it is ignored by default. The endpoint chains
    // to ISRG Root X2, which the keychain has and `/etc/ssl/cert.pem` is
    // missing, so on macOS it passes only when the keychain reader supplied the
    // blob.
    #[test]
    #[ignore = "network"]
    fn a_publicly_signed_endpoint_validates_with_no_user_ca_configured() {
        assert_eq!(perform("https://valid-isrgrootx2.letsencrypt.org/", None), 200);
    }

    // The combined blob has to keep the public roots after a user CA is added.
    // The certificate here is a self-signed root unrelated to the endpoint, so
    // only the system anchors in the blob can validate its chain.
    #[test]
    #[ignore = "network"]
    fn a_user_ca_extends_the_host_store() {
        let unrelated = Bytes::from_static(include_bytes!("../tests/unrelated-root.pem"));
        assert_eq!(
            perform("https://valid-isrgrootx2.letsencrypt.org/", Some(vec![unrelated])),
            200
        );
    }

    #[test]
    fn a_user_entry_that_is_not_pem_is_named_by_its_index() {
        let mut handle = Easy::new();
        let certs = vec![
            Bytes::from_static(include_bytes!("../tests/unrelated-root.pem")),
            Bytes::from_static(b"not a certificate"),
        ];
        let error = SecurityHandler::new(&mut handle)
            .configure_ca_certificates(&certs)
            .expect_err("an unparseable entry is an error");
        assert!(
            format!("{error:?}").contains("index 1"),
            "the error names the offending entry, got {error:?}"
        );
    }
}
