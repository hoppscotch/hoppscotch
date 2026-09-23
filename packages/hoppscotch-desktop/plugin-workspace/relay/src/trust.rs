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
const XKU_SGC: u32 = 0x10;
#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
const EXFLAG_XKUSAGE: u32 = 0x4;

const PEM_HEADER: &[u8] = b"-----BEGIN CERTIFICATE-----";
const PEM_FOOTER: &[u8] = b"-----END CERTIFICATE-----";

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
        Some(bundle) if !parse_lenient(&bundle.pem).is_empty() => bundle,
        _ => bundled(),
    }
}

/// Certificates OpenSSL can parse out of a PEM blob, block by block, since
/// `X509::stack_from_pem` discards every certificate it had already parsed
/// when it meets a malformed one, and a `ca-certificates.crt` with a single
/// bad entry among a hundred good ones is more likely than a file that holds
/// nothing parseable at all.
fn parse_lenient(pem: &[u8]) -> Vec<Vec<u8>> {
    let mut out = Vec::new();
    let mut rest = pem;
    while let Some(start) = find(rest, PEM_HEADER) {
        let block = &rest[start..];
        let end = match find(block, PEM_FOOTER) {
            Some(e) => e + PEM_FOOTER.len(),
            None => break,
        };
        if let Ok(cert) = X509::from_pem(&block[..end]) {
            if let Ok(der) = cert.to_der() {
                out.push(der);
            }
        }
        rest = &block[end..];
    }
    out
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
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
        openssl_sys::X509_get_extended_key_usage(ptr) & (XKU_SSL_SERVER | XKU_ANYEKU | XKU_SGC) != 0
    }
}

/// Keyed on the encoded certificate, since two roots can share a public key
/// and differ in subject or validity. `CN=Apple Root CA` and the expired
/// `CN=Apple Root Certificate Authority` share one key in the macOS System
/// domain, and an ADCS root renewal reuses its key by default, so keying on
/// the key would let enumeration order decide which of a live root and a dead
/// one reaches the blob. OpenSSL matches an anchor by issuer name, so both
/// have to be present.
fn dedup_exact(ders: Vec<Vec<u8>>) -> Vec<Vec<u8>> {
    let mut seen: HashSet<Vec<u8>> = HashSet::new();
    let mut out = Vec::with_capacity(ders.len());
    for der in ders {
        if seen.insert(der.clone()) {
            out.push(der);
        }
    }
    out
}

#[cfg_attr(
    not(any(target_os = "macos", target_os = "windows")),
    allow(dead_code)
)]
/// The PEM blob and the anchors it holds, which is what the trust source line
/// reports, since an anchor that fails re-encoding is absent from the blob and
/// counting before this point would overstate what curl received.
fn pem_encode(ders: &[Vec<u8>]) -> (Vec<u8>, usize) {
    let mut out = Vec::new();
    let mut encoded = 0usize;
    for der in ders {
        if let Ok(pem) = X509::from_der(der).and_then(|cert| cert.to_pem()) {
            out.extend_from_slice(&pem);
            if !out.ends_with(b"\n") {
                out.push(b'\n');
            }
            encoded += 1;
        } else {
            tracing::debug!("Anchor dropped, it does not re-encode as PEM");
        }
    }
    (out, encoded)
}

/// True where the bytes parse as at least one PEM certificate, which is
/// how a user entry is checked before it is added to the combined blob. The
/// check is the lenient one the host store reads with, ∵ a bundle whose last
/// block is corrupt still carries the CAs before it, and rejecting the entry
/// would drop them all.
pub(crate) fn parses_as_pem(pem: &[u8]) -> bool {
    !parse_lenient(pem).is_empty()
}

#[cfg_attr(not(target_os = "windows"), allow(dead_code))]
fn pem_to_ders(pem: &[u8]) -> Vec<Vec<u8>> {
    X509::stack_from_pem(pem)
        .map(|stack| stack.iter().filter_map(|cert| cert.to_der().ok()).collect())
        .unwrap_or_default()
}

/// What a domain says about one certificate. `Defer` passes the question to
/// the next domain down, which is what an empty trust settings array means
/// outside the System domain and what `Unspecified` means anywhere.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub(crate) enum Decision {
    Trust,
    Deny,
    Defer,
}

/// Anchors from entries ordered by descending domain precedence, User first
/// and System last. The first domain that decides a certificate settles it, so
/// a root the System domain ships and an administrator denies is excluded
/// rather than exported, and a certificate every domain defers on is absent.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn resolve_by_precedence(entries: Vec<(Vec<u8>, Vec<u8>, Decision)>) -> Vec<Vec<u8>> {
    let mut settled: HashSet<Vec<u8>> = HashSet::new();
    let mut out = Vec::new();
    for (key, der, decision) in entries {
        if decision == Decision::Defer || settled.contains(&key) {
            continue;
        }
        settled.insert(key);
        if decision == Decision::Trust {
            out.push(der);
        }
    }
    out
}

#[cfg(target_os = "macos")]
fn read_platform() -> Option<TrustBundle> {
    use security_framework::trust_settings::{Domain, TrustSettings, TrustSettingsForCertificate};

    let mut entries: Vec<(Vec<u8>, Vec<u8>, Decision)> = Vec::new();
    let mut read = 0usize;
    let mut system_read = false;

    // User settings override Admin settings, which override what the System
    // domain ships, so the domains are read in that order and the first
    // decision on a certificate is the effective one.
    for domain in [Domain::User, Domain::Admin, Domain::System] {
        let settings = TrustSettings::new(domain);
        let Ok(certificates) = settings.iter() else {
            tracing::warn!(domain = ?domain, "Trust domain unreadable");
            continue;
        };
        if matches!(domain, Domain::System) {
            system_read = true;
        }
        for cert in certificates {
            read += 1;
            let der = cert.to_der();
            let decision = match settings.tls_trust_settings_for_certificate(&cert) {
                // An administrator's explicit SSL trust setting is taken
                // without the extended key usage check, since the
                // administrator already chose the policy.
                Ok(Some(TrustSettingsForCertificate::TrustRoot))
                | Ok(Some(TrustSettingsForCertificate::TrustAsRoot)) => Decision::Trust,
                Ok(Some(TrustSettingsForCertificate::Deny)) => Decision::Deny,
                // An empty trust settings array means trusted in the System
                // domain, where it is the default for every anchor Apple
                // ships, and means defer in Admin and User.
                Ok(None) if matches!(domain, Domain::System) => {
                    if valid_for_tls(&der) {
                        Decision::Trust
                    } else {
                        Decision::Deny
                    }
                }
                Ok(_) => Decision::Defer,
                // A policy that cannot be read grants nothing, ∵ an anchor
                // exported on a failed read is one curl trusts while the
                // keychain may deny it, and the warning says which domain
                // went unread so a missing corporate root has a cause.
                Err(e) => {
                    tracing::warn!(error = %e, domain = ?domain, "Trust settings read failed");
                    Decision::Defer
                }
            };
            entries.push((der.clone(), der, decision));
        }
    }

    let denied: Vec<Vec<u8>> = entries
        .iter()
        .filter(|(_, _, decision)| *decision == Decision::Deny)
        .map(|(_, der, _)| der.clone())
        .collect();
    let mut ders = resolve_by_precedence(entries);
    if read == 0 {
        return None;
    }
    // A System domain that failed to open leaves the public roots out, and a
    // blob of locally installed roots alone would fail every public endpoint,
    // so the compiled-in set stands in for the domain that went unread. The
    // roots a domain denied are removed from it, ∵ a fallback that restored
    // them would undo the denial that made the read empty.
    if !system_read || ders.is_empty() {
        tracing::warn!(
            anchors = ders.len(),
            "Host trust store read short, extending with the bundled roots"
        );
        let mut bundled = parse_lenient(curl_sys::certs::get_cert_content().as_bytes());
        bundled.retain(|der| !denied.contains(der));
        ders.extend(bundled);
    }

    let ders = dedup_exact(ders);
    let (pem, retained) = pem_encode(&ders);
    Some(TrustBundle {
        source: TrustSource::MacosKeychain,
        pem,
        read,
        retained,
    })
}

#[cfg(target_os = "windows")]
fn read_platform() -> Option<TrustBundle> {
    use std::ptr;

    use windows_sys::Win32::Foundation::{GetLastError, CRYPT_E_NOT_FOUND};
    use windows_sys::Win32::Security::Cryptography::{
        CertCloseStore, CertEnumCertificatesInStore, CertGetEnhancedKeyUsage, CertOpenStore,
        CERT_CONTEXT, CERT_ENHKEY_USAGE, CERT_FIND_PROP_ONLY_ENHKEY_USAGE_FLAG,
        CERT_STORE_OPEN_EXISTING_FLAG, CERT_STORE_PROV_SYSTEM_W, CERT_STORE_READONLY_FLAG,
        CERT_SYSTEM_STORE_CURRENT_USER, CERT_SYSTEM_STORE_CURRENT_USER_GROUP_POLICY,
        CERT_SYSTEM_STORE_LOCAL_MACHINE, CERT_SYSTEM_STORE_LOCAL_MACHINE_ENTERPRISE,
        CERT_SYSTEM_STORE_LOCAL_MACHINE_GROUP_POLICY,
    };

    // Windows can install an enterprise root into any of these locations, and
    // the group policy and enterprise locations are separate physical stores
    // that the system view does not always merge.
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

    // Every certificate in a `CURLOPT_CAINFO_BLOB` is a trust anchor, and the
    // `CA` store holds intermediates that Windows chains through a root, so
    // anchors come from `ROOT` and `Disallowed` says which of them an
    // administrator has revoked.
    // What the store entry says a root may be used for. Windows keeps the
    // permitted purposes in the entry's enhanced key usage property, which
    // `pbCertEncoded` does not carry, so a root restricted to code signing
    // looks unrestricted to anything that reads the certificate alone.
    enum StoreUsage {
        Restricted(Vec<String>),
        Unrestricted,
    }

    const SERVER_AUTH_OID: &str = "1.3.6.1.5.5.7.3.1";
    const ANY_USAGE_OID: &str = "2.5.29.37.0";

    fn store_usage(ctx: *const CERT_CONTEXT) -> StoreUsage {
        let mut size = 0u32;
        let ok = unsafe {
            CertGetEnhancedKeyUsage(
                ctx,
                CERT_FIND_PROP_ONLY_ENHKEY_USAGE_FLAG,
                std::ptr::null_mut(),
                &mut size,
            )
        };
        if ok == 0 || size == 0 {
            return StoreUsage::Unrestricted;
        }
        let mut buffer = vec![0u8; size as usize];
        let usage = buffer.as_mut_ptr() as *mut CERT_ENHKEY_USAGE;
        let ok = unsafe {
            CertGetEnhancedKeyUsage(
                ctx,
                CERT_FIND_PROP_ONLY_ENHKEY_USAGE_FLAG,
                usage,
                &mut size,
            )
        };
        if ok == 0 {
            return StoreUsage::Unrestricted;
        }
        let usage = unsafe { &*usage };
        if usage.cUsageIdentifier == 0 {
            return StoreUsage::Unrestricted;
        }
        let mut oids = Vec::with_capacity(usage.cUsageIdentifier as usize);
        for index in 0..usage.cUsageIdentifier as usize {
            let oid = unsafe { *usage.rgpszUsageIdentifier.add(index) };
            if oid.is_null() {
                continue;
            }
            let text = unsafe { std::ffi::CStr::from_ptr(oid as *const i8) };
            if let Ok(text) = text.to_str() {
                oids.push(text.to_owned());
            }
        }
        StoreUsage::Restricted(oids)
    }

    fn read_store(flag: u32, label: &str, name: &str) -> Option<Vec<(Vec<u8>, StoreUsage)>> {
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
            return None;
        }
        let mut ders = Vec::new();
        let mut ctx: *const CERT_CONTEXT = ptr::null();
        let mut complete = false;
        loop {
            ctx = unsafe { CertEnumCertificatesInStore(store, ctx) };
            if ctx.is_null() {
                // The API returns null both at the end of the store and on a
                // failure, and only `CRYPT_E_NOT_FOUND` means the store was
                // read to its end.
                complete = unsafe { GetLastError() } as i32 == CRYPT_E_NOT_FOUND;
                if !complete {
                    tracing::warn!(
                        store = %format!("{label}/{name}"),
                        "Certificate store enumeration failed partway"
                    );
                }
                break;
            }
            let der = unsafe {
                std::slice::from_raw_parts((*ctx).pbCertEncoded, (*ctx).cbCertEncoded as usize)
            }
            .to_vec();
            ders.push((der, store_usage(ctx)));
        }
        // Closed on the enumeration's only exit, so every store that opens is
        // released exactly once.
        unsafe { CertCloseStore(store, 0) };
        complete.then_some(ders)
    }

    let mut roots: Vec<(Vec<u8>, StoreUsage)> = Vec::new();
    let mut revoked: Vec<Vec<u8>> = Vec::new();
    let mut read = 0usize;
    for (flag, label) in LOCATIONS {
        if let Some(entries) = read_store(*flag, label, "ROOT") {
            read += entries.len();
            roots.extend(entries);
        }
        if let Some(entries) = read_store(*flag, label, "Disallowed") {
            revoked.extend(entries.into_iter().map(|(der, _)| der));
        }
    }

    // A root Windows restricts to code signing or timestamping is still a TLS
    // anchor once it is in the blob, and the restriction lives in the store
    // entry's enhanced key usage property as often as in the certificate, so
    // both are read.
    roots.retain(|(_, usage)| match usage {
        StoreUsage::Restricted(oids) => oids
            .iter()
            .any(|oid| oid == SERVER_AUTH_OID || oid == ANY_USAGE_OID),
        StoreUsage::Unrestricted => true,
    });
    let mut roots: Vec<Vec<u8>> = roots.into_iter().map(|(der, _)| der).collect();
    roots.retain(|der| valid_for_tls(der));
    roots.retain(|der| !revoked.contains(der));

    // Windows fills `ROOT` on demand, so the store has only the roots this
    // machine has already needed, and the Automatic Root Certificates Update
    // component downloads the rest from Windows Update during verification. An
    // export cannot trigger that download, so the bundle supplies the public
    // CAs the store is missing, minus anything `Disallowed` names.
    let mut bundled = parse_lenient(curl_sys::certs::get_cert_content().as_bytes());
    bundled.retain(|der| !revoked.contains(der));
    roots.extend(bundled);

    let ders = dedup_exact(roots);
    if ders.is_empty() {
        return None;
    }

    let (pem, retained) = pem_encode(&ders);
    Some(TrustBundle {
        source: TrustSource::WindowsStores,
        pem,
        read,
        retained,
    })
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn read_platform() -> Option<TrustBundle> {
    let probe = openssl_probe::probe();
    let mut ders = Vec::new();

    if let Some(path) = probe.cert_file.as_ref() {
        ders.extend(parse_lenient(&std::fs::read(path).unwrap_or_default()));
    }
    // `probe` reports a file and a directory independently, and a host that
    // keeps its anchors as one file per CA answers with the directory alone,
    // where the enterprise CA an administrator dropped in is the reason to
    // read it.
    if let Some(dir) = probe.cert_dir.as_ref() {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                ders.extend(parse_lenient(&std::fs::read(entry.path()).unwrap_or_default()));
            }
        }
    }

    let ders = dedup_exact(ders);
    if ders.is_empty() {
        return None;
    }

    let (pem, retained) = pem_encode(&ders);
    Some(TrustBundle {
        source: TrustSource::OpensslProbe,
        pem,
        read: ders.len(),
        retained,
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

    // `CN=Apple Root CA` and the expired `CN=Apple Root Certificate Authority`
    // share a public key in the macOS System domain, so keying identity on the
    // key would let enumeration order decide which one anchors a chain.
    #[test]
    fn two_roots_sharing_a_public_key_are_both_kept() {
        let shared = key();
        let first = root("first", &shared, None);
        let reissued = root("second", &shared, None);
        assert_ne!(first, reissued);
        assert_eq!(
            dedup_exact(vec![first.clone(), reissued.clone()]),
            vec![first, reissued]
        );
    }

    #[test]
    fn the_same_certificate_from_two_stores_appears_once() {
        let der = root("shared", &key(), None);
        assert_eq!(dedup_exact(vec![der.clone(), der.clone()]), vec![der]);
    }

    #[test]
    fn a_der_anchor_round_trips_through_pem() {
        let der = root("round", &key(), None);
        let (pem, encoded) = pem_encode(&[der.clone()]);
        assert!(pem.starts_with(PEM_HEADER));
        assert!(pem.ends_with(b"\n"));
        assert_eq!(encoded, 1);
        assert_eq!(parse_lenient(&pem), vec![der]);
    }

    #[test]
    fn an_anchor_that_does_not_encode_is_absent_from_the_count() {
        let der = root("encodes", &key(), None);
        let (pem, encoded) = pem_encode(&[der.clone(), b"not a certificate".to_vec()]);
        assert_eq!(encoded, 1);
        assert_eq!(parse_lenient(&pem), vec![der]);
    }

    // A user entry is checked with the same lenient parser the host store is
    // read with, so a bundle whose last block is corrupt keeps the CAs before
    // it instead of being rejected whole.
    #[test]
    fn a_bundle_with_one_corrupt_block_still_parses_as_pem() {
        let (pem, _) = pem_encode(&[root("good", &key(), None)]);
        let mut mixed = pem.clone();
        mixed.extend_from_slice(b"-----BEGIN CERTIFICATE-----\ntruncated\n-----END CERTIFICATE-----\n");
        assert!(parses_as_pem(&mixed));
        assert!(!parses_as_pem(b"not a certificate"));
    }

    #[test]
    fn a_file_that_parses_to_no_certificate_yields_no_anchor() {
        assert!(parse_lenient(b"# comment only\n").is_empty());
        assert!(parse_lenient(b"-----BEGIN CERTIFICATE-----\ntruncated\n").is_empty());
    }

    // A `ca-certificates.crt` with one malformed entry among many good ones is
    // likelier than a file that holds nothing parseable, and `stack_from_pem`
    // discards everything it had read when it meets the bad one.
    #[test]
    fn one_malformed_block_leaves_the_rest_of_the_file() {
        let good = root("good", &key(), None);
        let other = root("other", &key(), None);
        let (first, _) = pem_encode(&[good.clone()]);
        let (second, _) = pem_encode(&[other.clone()]);
        let mut pem = first;
        pem.extend_from_slice(b"-----BEGIN CERTIFICATE-----\nnot base64\n-----END CERTIFICATE-----\n");
        pem.extend_from_slice(&second);
        assert_eq!(parse_lenient(&pem), vec![good, other]);
        assert!(X509::stack_from_pem(&pem).is_err());
    }

    #[test]
    fn a_deny_in_a_higher_domain_drops_the_system_anchor() {
        let der = root("denied", &key(), None);
        let anchors = resolve_by_precedence(vec![
            (b"k".to_vec(), der.clone(), Decision::Deny),
            (b"k".to_vec(), der, Decision::Trust),
        ]);
        assert!(anchors.is_empty());
    }

    #[test]
    fn a_defer_passes_the_question_to_the_next_domain() {
        let der = root("deferred", &key(), None);
        let anchors = resolve_by_precedence(vec![
            (b"k".to_vec(), der.clone(), Decision::Defer),
            (b"k".to_vec(), der.clone(), Decision::Trust),
        ]);
        assert_eq!(anchors, vec![der]);
    }

    #[test]
    fn the_highest_domain_that_decides_settles_the_certificate() {
        let trusted = root("user-trusted", &key(), None);
        let other = root("other", &key(), None);
        let anchors = resolve_by_precedence(vec![
            (b"k".to_vec(), trusted.clone(), Decision::Trust),
            (b"k".to_vec(), trusted.clone(), Decision::Deny),
            (b"j".to_vec(), other.clone(), Decision::Deny),
            (b"j".to_vec(), other, Decision::Trust),
        ]);
        assert_eq!(anchors, vec![trusted]);
    }

    #[test]
    fn the_bundled_fallback_includes_public_roots() {
        let bundle = bundled();
        assert_eq!(bundle.source, TrustSource::Bundled);
        assert!(bundle.retained > 100, "bundled anchors: {}", bundle.retained);
        assert!(!parse_lenient(&bundle.pem).is_empty());
    }
}
