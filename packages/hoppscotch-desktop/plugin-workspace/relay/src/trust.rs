//! Reads the host trust store into a PEM blob.
//!
//! Vendored OpenSSL has no anchors of its own, and `openssl_probe` checks a
//! fixed list of bundle file paths, which matches how Linux stores its anchors.
//! On macOS the probe returns `/etc/ssl/cert.pem`, a LibreSSL-derived snapshot
//! last revised upstream in 2021 that omits anchors the keychain has, ISRG Root
//! X2 among them, and on Windows it returns nothing, since Group Policy
//! installs enterprise CAs into the `ROOT` and `CA` stores. So this module
//! reads the keychain on macOS and the certificate stores on Windows, and uses
//! the probe on Linux, where the bundle file is the host store.

use std::collections::HashSet;

use foreign_types::ForeignType;
use openssl::x509::X509;

// `X509_get_extension_flags` sets `EXFLAG_XKUSAGE` when the certificate has an
// extended key usage extension, which tells a root that constrains its usage
// apart from one that declares no constraint, and `X509_get_extended_key_usage`
// returns the `XKU_*` bitmask.
#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
const XKU_SSL_SERVER: u32 = 0x1;
#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
const XKU_ANYEKU: u32 = 0x100;
#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
const EXFLAG_XKUSAGE: u32 = 0x4;

const PEM_HEADER: &[u8] = b"-----BEGIN CERTIFICATE-----";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[allow(dead_code)]
pub(crate) enum TrustSource {
    MacosKeychain,
    WindowsStores,
    OpensslProbe,
    Bundled,
}

impl TrustSource {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            TrustSource::MacosKeychain => "macos-keychain",
            TrustSource::WindowsStores => "windows-cert-stores",
            TrustSource::OpensslProbe => "openssl-probe",
            TrustSource::Bundled => "bundled-cacert",
        }
    }
}

pub(crate) struct TrustBundle {
    pub(crate) source: TrustSource,
    pub(crate) pem: Vec<u8>,
    pub(crate) read: usize,
    pub(crate) retained: usize,
}

/// Returns the host store when it can be read and the `curl-sys` bundle when
/// the read returns no anchors, since a blob written into `CURLOPT_CAINFO_BLOB`
/// replaces whatever curl set from its own probe, and an empty blob would
/// remove the public roots curl had already set on the handle.
pub(crate) fn load() -> TrustBundle {
    match read_platform() {
        Some(bundle) if !bundle.pem.is_empty() => bundle,
        _ => bundled(),
    }
}

fn bundled() -> TrustBundle {
    let pem = curl_sys::certs::get_cert_content().as_bytes().to_vec();
    let count = count_anchors(&pem);
    TrustBundle {
        source: TrustSource::Bundled,
        pem,
        read: count,
        retained: count,
    }
}

fn count_anchors(pem: &[u8]) -> usize {
    pem.windows(PEM_HEADER.len())
        .filter(|window| *window == PEM_HEADER)
        .count()
}

/// True where the anchor may sign a server certificate, meaning it asserts
/// `id-kp-serverAuth` or `anyExtendedKeyUsage`, or asserts no extended key
/// usage and is unconstrained by design. macOS applies this check in the policy
/// layer of `SecTrustEvaluate`, which a PEM export cannot encode, so a
/// code-signing or timestamping root in the blob would validate under the relay
/// and fail in Safari on the same machine.
#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
fn valid_for_tls(der: &[u8]) -> bool {
    let Ok(cert) = X509::from_der(der) else {
        return false;
    };
    unsafe {
        let ptr = cert.as_ptr();
        if openssl_sys::X509_get_extension_flags(ptr) & EXFLAG_XKUSAGE == 0 {
            return true;
        }
        openssl_sys::X509_get_extended_key_usage(ptr) & (XKU_SSL_SERVER | XKU_ANYEKU) != 0
    }
}

#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
fn public_key_id(der: &[u8]) -> Option<Vec<u8>> {
    let cert = X509::from_der(der).ok()?;
    cert.public_key().ok()?.public_key_to_der().ok()
}

/// Keyed on public key, since the same anchor is cross-signed and reissued
/// under different serials and appears in a store export and in the bundle as
/// different byte strings.
#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
fn dedup_by_public_key(ders: Vec<Vec<u8>>) -> Vec<Vec<u8>> {
    let mut seen: HashSet<Vec<u8>> = HashSet::new();
    let mut out = Vec::with_capacity(ders.len());
    for der in ders {
        let key = public_key_id(&der).unwrap_or_else(|| der.clone());
        if seen.insert(key) {
            out.push(der);
        }
    }
    out
}

#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
fn pem_encode(ders: &[Vec<u8>]) -> Vec<u8> {
    let mut out = Vec::new();
    for der in ders {
        if let Ok(pem) = X509::from_der(der).and_then(|cert| cert.to_pem()) {
            out.extend_from_slice(&pem);
            if !out.ends_with(b"\n") {
                out.push(b'\n');
            }
        }
    }
    out
}

/// True where the bytes parse as at least one PEM certificate, which is
/// how a user entry is checked before it is added to the combined blob.
pub(crate) fn parses_as_pem(pem: &[u8]) -> bool {
    X509::stack_from_pem(pem).map(|s| !s.is_empty()).unwrap_or(false)
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn pem_to_ders(pem: &[u8]) -> Vec<Vec<u8>> {
    X509::stack_from_pem(pem)
        .map(|stack| stack.iter().filter_map(|cert| cert.to_der().ok()).collect())
        .unwrap_or_default()
}

#[cfg(target_os = "macos")]
fn read_platform() -> Option<TrustBundle> {
    use security_framework::trust_settings::{Domain, TrustSettings, TrustSettingsForCertificate};

    let mut ders: Vec<Vec<u8>> = Vec::new();
    let mut read = 0usize;

    for domain in [Domain::System, Domain::Admin, Domain::User] {
        let settings = TrustSettings::new(domain);
        let Ok(certificates) = settings.iter() else {
            tracing::debug!(domain = ?domain, "Trust domain unreadable");
            continue;
        };
        for cert in certificates {
            read += 1;
            let der = cert.to_der();
            match settings.tls_trust_settings_for_certificate(&cert) {
                // An administrator's explicit SSL trust setting is kept without
                // the extended key usage check, since the administrator already
                // chose the policy.
                Ok(Some(TrustSettingsForCertificate::TrustRoot))
                | Ok(Some(TrustSettingsForCertificate::TrustAsRoot)) => ders.push(der),
                // An empty trust settings array means trusted in the System
                // domain, where it is the default for every anchor Apple ships,
                // and means defer to the next domain in Admin and User, so an
                // anchor with an empty array is kept only from System.
                Ok(None) if matches!(domain, Domain::System) => {
                    if valid_for_tls(&der) {
                        ders.push(der);
                    }
                }
                Ok(_) => {}
                Err(e) => tracing::debug!(error = %e, "Trust settings read failed"),
            }
        }
    }

    if ders.is_empty() {
        return None;
    }

    let ders = dedup_by_public_key(ders);
    Some(TrustBundle {
        source: TrustSource::MacosKeychain,
        pem: pem_encode(&ders),
        read,
        retained: ders.len(),
    })
}

#[cfg(target_os = "windows")]
fn read_platform() -> Option<TrustBundle> {
    use std::ptr;

    use windows_sys::Win32::Security::Cryptography::{
        CertCloseStore, CertEnumCertificatesInStore, CertOpenStore, CERT_CONTEXT,
        CERT_STORE_OPEN_EXISTING_FLAG, CERT_STORE_PROV_SYSTEM_W, CERT_STORE_READONLY_FLAG,
        CERT_SYSTEM_STORE_CURRENT_USER, CERT_SYSTEM_STORE_CURRENT_USER_GROUP_POLICY,
        CERT_SYSTEM_STORE_LOCAL_MACHINE, CERT_SYSTEM_STORE_LOCAL_MACHINE_ENTERPRISE,
        CERT_SYSTEM_STORE_LOCAL_MACHINE_GROUP_POLICY,
    };

    // Windows can install an enterprise CA into `ROOT` or `CA` in any of these
    // locations, where `ROOT` has the self-signed anchors and `CA` has the
    // intermediates a Group Policy push usually installs with them, and the
    // group policy and enterprise locations are separate physical stores that
    // the system view does not always merge.
    const LOCATIONS: &[(u32, &str)] = &[
        (CERT_SYSTEM_STORE_LOCAL_MACHINE, "LocalMachine"),
        (CERT_SYSTEM_STORE_CURRENT_USER, "CurrentUser"),
        (
            CERT_SYSTEM_STORE_LOCAL_MACHINE_GROUP_POLICY,
            "LocalMachineGroupPolicy",
        ),
        (
            CERT_SYSTEM_STORE_CURRENT_USER_GROUP_POLICY,
            "CurrentUserGroupPolicy",
        ),
        (
            CERT_SYSTEM_STORE_LOCAL_MACHINE_ENTERPRISE,
            "LocalMachineEnterprise",
        ),
    ];
    const NAMES: &[&str] = &["ROOT", "CA"];

    let mut ders: Vec<Vec<u8>> = Vec::new();
    let mut read = 0usize;

    for (flag, label) in LOCATIONS {
        for name in NAMES {
            let wide: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
            let store = unsafe {
                CertOpenStore(
                    CERT_STORE_PROV_SYSTEM_W,
                    0,
                    0,
                    flag | CERT_STORE_READONLY_FLAG | CERT_STORE_OPEN_EXISTING_FLAG,
                    wide.as_ptr() as *const _,
                )
            };
            if store.is_null() {
                tracing::debug!(store = %format!("{label}/{name}"), "Certificate store absent");
                continue;
            }
            let mut ctx: *const CERT_CONTEXT = ptr::null();
            loop {
                ctx = unsafe { CertEnumCertificatesInStore(store, ctx) };
                if ctx.is_null() {
                    break;
                }
                read += 1;
                ders.push(
                    unsafe {
                        std::slice::from_raw_parts(
                            (*ctx).pbCertEncoded,
                            (*ctx).cbCertEncoded as usize,
                        )
                    }
                    .to_vec(),
                );
            }
            // Closed on the enumeration's only exit, so every store that opens
            // is released exactly once.
            unsafe { CertCloseStore(store, 0) };
        }
    }

    // Windows fills `ROOT` on demand, so the store has only the roots this
    // machine has already needed, and the Automatic Root Certificates Update
    // component downloads the rest from Windows Update during verification. An
    // export cannot trigger that download, and where the component never
    // executes, under `DisableRootAutoUpdate`, on Server Core, or on a host
    // with no Windows Update access, the export has a handful of anchors, so
    // the bundle is unioned with the store, where the bundle supplies the
    // public CAs the store is missing and the store supplies the enterprise CAs
    // only this machine has.
    ders.extend(pem_to_ders(curl_sys::certs::get_cert_content().as_bytes()));

    let ders = dedup_by_public_key(ders);
    if ders.is_empty() {
        return None;
    }

    Some(TrustBundle {
        source: TrustSource::WindowsStores,
        pem: pem_encode(&ders),
        read,
        retained: ders.len(),
    })
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn read_platform() -> Option<TrustBundle> {
    let path = openssl_probe::probe().cert_file?;
    let pem = std::fs::read(&path).ok()?;
    let count = count_anchors(&pem);
    Some(TrustBundle {
        source: TrustSource::OpensslProbe,
        pem,
        read: count,
        retained: count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    use openssl::asn1::Asn1Time;
    use openssl::hash::MessageDigest;
    use openssl::pkey::{PKey, Private};
    use openssl::rsa::Rsa;
    use openssl::x509::extension::{BasicConstraints, ExtendedKeyUsage};
    use openssl::x509::X509Name;

    fn key() -> PKey<Private> {
        PKey::from_rsa(Rsa::generate(2048).expect("rsa")).expect("pkey")
    }

    fn root(cn: &str, key: &PKey<Private>, eku: Option<ExtendedKeyUsage>) -> Vec<u8> {
        let mut name = X509Name::builder().expect("name builder");
        name.append_entry_by_text("CN", cn).expect("cn");
        let name = name.build();

        let mut builder = X509::builder().expect("cert builder");
        builder.set_version(2).expect("version");
        builder.set_subject_name(&name).expect("subject");
        builder.set_issuer_name(&name).expect("issuer");
        builder.set_pubkey(key).expect("pubkey");
        builder
            .set_not_before(&Asn1Time::days_from_now(0).expect("now"))
            .expect("not before");
        builder
            .set_not_after(&Asn1Time::days_from_now(365).expect("year"))
            .expect("not after");
        builder
            .append_extension(
                BasicConstraints::new()
                    .critical()
                    .ca()
                    .build()
                    .expect("basic constraints"),
            )
            .expect("append basic constraints");
        if let Some(eku) = eku {
            builder
                .append_extension(eku.build().expect("eku"))
                .expect("append eku");
        }
        builder.sign(key, MessageDigest::sha256()).expect("sign");
        builder.build().to_der().expect("der")
    }

    #[test]
    fn an_anchor_with_no_extended_key_usage_is_retained() {
        assert!(valid_for_tls(&root("no-eku", &key(), None)));
    }

    #[test]
    fn a_server_auth_anchor_is_retained() {
        let mut eku = ExtendedKeyUsage::new();
        eku.server_auth();
        assert!(valid_for_tls(&root("server", &key(), Some(eku))));
    }

    #[test]
    fn an_any_extended_key_usage_anchor_is_retained() {
        let mut eku = ExtendedKeyUsage::new();
        eku.other("2.5.29.37.0");
        assert!(valid_for_tls(&root("any", &key(), Some(eku))));
    }

    // Apple Platform Code Signing, Sectigo Public Time Stamping and the
    // S/MIME-only roots are in the System domain without being TLS anchors, so
    // an unfiltered export would let curl trust roots that macOS refuses for
    // TLS.
    #[test]
    fn code_signing_timestamping_and_email_anchors_are_excluded() {
        let signing = {
            let mut eku = ExtendedKeyUsage::new();
            eku.code_signing();
            eku
        };
        let stamping = {
            let mut eku = ExtendedKeyUsage::new();
            eku.time_stamping();
            eku
        };
        let email = {
            let mut eku = ExtendedKeyUsage::new();
            eku.email_protection();
            eku
        };
        for eku in [signing, stamping, email] {
            assert!(!valid_for_tls(&root("constrained", &key(), Some(eku))));
        }
    }

    #[test]
    fn a_certificate_that_does_not_parse_is_not_an_anchor() {
        assert!(!valid_for_tls(b"not a certificate"));
    }

    #[test]
    fn anchors_sharing_a_public_key_appear_once() {
        let shared = key();
        let first = root("first", &shared, None);
        let reissued = root("second", &shared, None);
        assert_ne!(first, reissued);
        assert_eq!(dedup_by_public_key(vec![first.clone(), reissued]).len(), 1);
        assert_eq!(
            dedup_by_public_key(vec![first, root("third", &key(), None)]).len(),
            2
        );
    }

    #[test]
    fn a_der_anchor_round_trips_through_pem() {
        let der = root("round", &key(), None);
        let pem = pem_encode(&[der.clone()]);
        assert!(pem.starts_with(PEM_HEADER));
        assert!(pem.ends_with(b"\n"));
        assert_eq!(pem_to_ders(&pem), vec![der]);
        assert_eq!(count_anchors(&pem), 1);
    }

    #[test]
    fn the_bundled_fallback_includes_public_roots() {
        let bundle = bundled();
        assert_eq!(bundle.source, TrustSource::Bundled);
        assert!(bundle.retained > 100, "bundled anchors: {}", bundle.retained);
    }
}
