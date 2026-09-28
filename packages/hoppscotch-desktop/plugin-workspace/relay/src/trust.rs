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
//!
//! The usage filter applies to the platforms that export a store, ∵ macOS and
//! Windows both keep code signing and timestamping roots beside the TLS ones,
//! where a `ca-certificates.crt` on Linux is a TLS anchor set already and its
//! maintainer decided what belongs in it.

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
/// bad entry among a hundred good ones is more likely than a file with
/// nothing parseable in it at all.
fn parse_lenient(pem: &[u8]) -> Vec<Vec<u8>> {
    let mut out = Vec::new();
    let mut rest = pem;
    while let Some(start) = find(rest, PEM_HEADER) {
        let block = &rest[start + PEM_HEADER.len()..];
        // A block with no footer of its own ends where the next one begins,
        // ∵ a footer found past that header belongs to the later block, and
        // parsing the pair as one takes the later certificate down with the
        // truncated one this scan is here to survive.
        let next = find(block, PEM_HEADER);
        let end = match find(block, PEM_FOOTER) {
            Some(e) if next.is_none_or(|n| e < n) => e + PEM_FOOTER.len(),
            _ => {
                rest = match next {
                    Some(n) => &block[n..],
                    None => break,
                };
                continue;
            }
        };
        let whole = &rest[start..start + PEM_HEADER.len() + end];
        if let Ok(cert) = X509::from_pem(whole) {
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
/// The PEM blob and the count of anchors in it, which is what the trust source line
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
/// block is corrupt still supplies the CAs before it, and rejecting the entry
/// would drop them all.
pub(crate) fn parses_as_pem(pem: &[u8]) -> bool {
    !parse_lenient(pem).is_empty()
}

/// The certificates of a user entry, re-encoded, since `CURLOPT_CAINFO_BLOB`
/// is parsed all at once and one malformed block in the middle of the blob
/// discards every certificate OpenSSL had read from it, the user's and the
/// host's alike.
pub(crate) fn normalize_pem(pem: &[u8]) -> Vec<u8> {
    pem_encode(&parse_lenient(pem)).0
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

/// The decision a domain's trust setting makes about one certificate, kept
/// apart from the keychain read so the policy can be exercised offline.
///
/// An explicit SSL trust setting in Admin or User is taken without the
/// extended key usage check, ∵ an administrator or the person at the machine
/// chose that policy against what the certificate itself states. The System
/// domain gets no such exemption, ∵ Apple ships those settings beside roots
/// issued for code signing, timestamping and S/MIME, and an entry stating no
/// server authentication usage is not a TLS anchor whatever the shipped
/// setting says. An empty settings array means trusted in System and defer
/// elsewhere, and a setting this process could not read grants nothing.
#[cfg(target_os = "macos")]
fn decide(
    is_system: bool,
    setting: Result<Option<security_framework::trust_settings::TrustSettingsForCertificate>, ()>,
    der: &[u8],
) -> Decision {
    use security_framework::trust_settings::TrustSettingsForCertificate;

    match setting {
        Ok(Some(TrustSettingsForCertificate::TrustRoot))
        | Ok(Some(TrustSettingsForCertificate::TrustAsRoot)) => {
            if is_system && !valid_for_tls(der) {
                Decision::Deny
            } else {
                Decision::Trust
            }
        }
        Ok(Some(TrustSettingsForCertificate::Deny)) => Decision::Deny,
        // `None` is what the domain answers for a certificate whose settings
        // say nothing about TLS, and `security-framework` folds
        // `Unspecified` and `Invalid` into it as well rather than returning
        // them, so this arm is where an unspecified System entry arrives. The
        // default it means is the trust Apple ships, so the certificate is an
        // anchor where its usage allows one. FE-1386 covers the empty settings
        // array, which Apple documents as trust and which arrives here too.
        Ok(None) if is_system => {
            if valid_for_tls(der) {
                Decision::Trust
            } else {
                Decision::Deny
            }
        }
        Ok(_) => Decision::Defer,
        Err(()) => Decision::Defer,
    }
}

/// How many of the resolved anchors the System domain contributed, which is
/// what decides the fallback, ∵ the public roots are System's and a trusted
/// User or Admin anchor beside an empty System domain is not a trust store.
#[cfg(target_os = "macos")]
fn system_anchor_count(resolved: &[Vec<u8>], system: &[Vec<u8>]) -> usize {
    resolved
        .iter()
        .filter(|der| system.contains(der))
        .count()
}

#[cfg(target_os = "macos")]
fn read_platform() -> Option<TrustBundle> {
    use security_framework::trust_settings::{Domain, TrustSettings};

    let mut entries: Vec<(Vec<u8>, Vec<u8>, Decision)> = Vec::new();
    let mut read = 0usize;
    let mut system_read = false;
    let mut denials_known = true;
    let mut system_certificates: Vec<Vec<u8>> = Vec::new();

    // User settings override Admin settings, which override what the System
    // domain ships, so the domains are read in that order and the first
    // decision on a certificate is the effective one.
    for domain in [Domain::User, Domain::Admin, Domain::System] {
        let settings = TrustSettings::new(domain);
        let Ok(certificates) = settings.iter() else {
            tracing::warn!(domain = ?domain, "Trust domain unreadable");
            // The denials of a domain that will not enumerate cannot be read
            // by any other call, so the fallback below is told that the
            // subtraction it performs is incomplete.
            if !matches!(domain, Domain::System) {
                denials_known = false;
            }
            continue;
        };
        if matches!(domain, Domain::System) {
            system_read = true;
        }
        for cert in certificates {
            read += 1;
            let der = cert.to_der();
            // A policy that cannot be read grants nothing, and the warning
            // names the domain, so a corporate root absent from the blob has a
            // cause to follow.
            let setting = settings
                .tls_trust_settings_for_certificate(&cert)
                .map_err(|e| {
                    tracing::warn!(error = %e, domain = ?domain, "Trust settings read failed");
                });
            let decision = decide(matches!(domain, Domain::System), setting, &der);
            if matches!(domain, Domain::System) {
                system_certificates.push(der.clone());
            }
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
    // The public roots come from the System domain, so the fallback keys on
    // what that domain contributed rather than on the resolved set, ∵ one
    // trusted User anchor beside a System domain that went unread, or whose
    // every entry was denied, would otherwise pass as a full trust store and
    // fail every public endpoint. The roots a domain denied are removed from
    // the compiled-in set, ∵ a fallback that restored them would undo the
    // denial that emptied the read.
    let system_anchors = system_anchor_count(&ders, &system_certificates);
    if !system_read || system_anchors == 0 {
        tracing::warn!(
            anchors = ders.len(),
            system_anchors,
            denials_known,
            "Host trust store read short, extending with the bundled roots"
        );
        // Where an Admin or User domain would not enumerate, the roots it
        // denies are unknown to every call this process can make, so the
        // subtraction covers the denials that were read and the warning above
        // says which case this is. FE-1382 decides the limit.
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

    use windows_sys::Win32::Foundation::{
        GetLastError, SetLastError, CRYPT_E_NOT_FOUND, ERROR_NO_MORE_FILES,
    };
    use windows_sys::Win32::Security::Cryptography::{
        CertCloseStore, CertEnumCertificatesInStore, CertGetEnhancedKeyUsage, CertOpenStore,
        CERT_CONTEXT, CERT_STORE_OPEN_EXISTING_FLAG, CERT_STORE_PROV_SYSTEM_W,
        CERT_STORE_READONLY_FLAG, CERT_SYSTEM_STORE_CURRENT_USER,
        CERT_SYSTEM_STORE_CURRENT_USER_GROUP_POLICY_ID, CERT_SYSTEM_STORE_LOCAL_MACHINE,
        CERT_SYSTEM_STORE_LOCAL_MACHINE_ENTERPRISE_ID,
        CERT_SYSTEM_STORE_LOCAL_MACHINE_GROUP_POLICY_ID, CERT_SYSTEM_STORE_LOCATION_SHIFT,
        CTL_USAGE,
    };

    // `Root` at `LOCAL_MACHINE` is a collection whose physical members are
    // `.Default`, `.AuthRoot`, `.GroupPolicy`, `.Enterprise` and `.SmartCard`,
    // and `Root` at `CURRENT_USER` adds `.LocalMachine`, so the first two
    // locations already cover the group policy and enterprise roots. The
    // policy locations are read as well, ∵ a physical store an administrator
    // unregisters from the collection is still readable at its own location,
    // and `dedup_exact` removes what the collections already returned.
    // `CertOpenStore` takes the location in the high word of `dwFlags`, and
    // `windows-sys` ships the machine and user locations already shifted while
    // the policy and enterprise locations exist only as their identifiers, so
    // those are shifted here by the documented amount.
    const LOCATION_SHIFT: u32 = CERT_SYSTEM_STORE_LOCATION_SHIFT;
    let locations: [(u32, &str); 5] = [
        (CERT_SYSTEM_STORE_LOCAL_MACHINE, "LocalMachine"),
        (CERT_SYSTEM_STORE_CURRENT_USER, "CurrentUser"),
        (
            CERT_SYSTEM_STORE_LOCAL_MACHINE_GROUP_POLICY_ID << LOCATION_SHIFT,
            "LocalMachineGroupPolicy",
        ),
        (
            CERT_SYSTEM_STORE_CURRENT_USER_GROUP_POLICY_ID << LOCATION_SHIFT,
            "CurrentUserGroupPolicy",
        ),
        (
            CERT_SYSTEM_STORE_LOCAL_MACHINE_ENTERPRISE_ID << LOCATION_SHIFT,
            "LocalMachineEnterprise",
        ),
    ];

    // Every certificate in a `CURLOPT_CAINFO_BLOB` is a trust anchor, and the
    // `CA` store keeps intermediates that Windows chains through a root, so
    // anchors come from `ROOT` and `Disallowed` says which of them an
    // administrator has revoked.
    // What the store entry says a root may be used for. Windows keeps the
    // permitted purposes in the entry's enhanced key usage property, which
    // `pbCertEncoded` leaves out, so a root restricted to code signing
    // looks unrestricted to anything that reads the certificate alone.
    enum StoreUsage {
        Restricted(Vec<String>),
        Unrestricted,
        // The property could not be read, or it is present and names no usage
        // at all, which Windows distinguishes from an absent property by the
        // last error and which means the entry is valid for no purpose.
        Denied,
    }

    const SERVER_AUTH_OID: &str = "1.3.6.1.5.5.7.3.1";
    const ANY_USAGE_OID: &str = "2.5.29.37.0";

    // Windows itself computes the usages a certificate is valid for, and its
    // rule is the intersection, "If a certificate has both an EKU extension
    // and EKU extended properties, it is valid only for the uses that are on
    // both lists", so the call takes `dwFlags` of zero and the intersection
    // comes back rather than being assembled here from the property and the
    // extension separately.
    //
    // A zero usage count is ambiguous, and the documented test is the last
    // error, `CRYPT_E_NOT_FOUND` for a certificate valid for every use and
    // zero for one valid for none. The error is cleared
    // before each call, ∵ the enumeration around it ends with
    // `CRYPT_E_NOT_FOUND` of its own, which a certificate valid for no use
    // would otherwise inherit and be exported on.
    fn no_property() -> bool {
        let error = unsafe { GetLastError() };
        error as i32 == CRYPT_E_NOT_FOUND
    }

    fn store_usage(ctx: *const CERT_CONTEXT) -> StoreUsage {
        let mut size = 0u32;
        let ok = unsafe {
            SetLastError(0);
            CertGetEnhancedKeyUsage(ctx, 0, std::ptr::null_mut(), &mut size)
        };
        if ok == 0 {
            return if no_property() {
                StoreUsage::Unrestricted
            } else {
                tracing::warn!("Store entry usage property unreadable, entry denied");
                StoreUsage::Denied
            };
        }
        if size < std::mem::size_of::<CTL_USAGE>() as u32 {
            return StoreUsage::Denied;
        }
        // `CTL_USAGE` declares a pointer member, so the buffer the API writes
        // it into is allocated as words rather than bytes, ∵ a `Vec<u8>` gives
        // the cast no alignment to rely on.
        let words = (size as usize).div_ceil(std::mem::size_of::<usize>());
        let mut buffer = vec![0usize; words];
        let usage = buffer.as_mut_ptr() as *mut CTL_USAGE;
        let ok = unsafe {
            SetLastError(0);
            CertGetEnhancedKeyUsage(ctx, 0, usage, &mut size)
        };
        if ok == 0 {
            tracing::warn!("Store entry usage property unreadable, entry denied");
            return StoreUsage::Denied;
        }
        let usage = unsafe { &*usage };
        if usage.cUsageIdentifier == 0 {
            return if no_property() {
                StoreUsage::Unrestricted
            } else {
                StoreUsage::Denied
            };
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

    // A store that is not there and a store that would not read are different
    // answers, ∵ several locations ship no `Disallowed` store at all while a
    // read that fails partway leaves revocations unseen.
    // `CertOpenStore` documents one error code of its own and propagates
    // registry errors otherwise, so a store that is not provisioned and a
    // store an access failure kept shut cannot be told apart by the error.
    // The caller decides from what else that location returned instead.
    enum StoreError {
        Open,
        // What the enumeration returned before it failed, ∵ a partial `ROOT`
        // read still names roots this machine trusts and discarding them would
        // drop the enterprise anchors the whole reader exists for.
        Incomplete(Vec<(Vec<u8>, StoreUsage)>),
    }

    type StoreRead = std::result::Result<Vec<(Vec<u8>, StoreUsage)>, StoreError>;

    // The usage decides whether a root may anchor a TLS chain, and a
    // `Disallowed` entry is a revocation whatever its usage says, so the usage
    // is read for `ROOT` alone rather than computed over a store where it
    // changes nothing.
    fn read_store(flag: u32, label: &str, name: &str, with_usage: bool) -> StoreRead {
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
            let error = unsafe { GetLastError() };
            tracing::debug!(
                store = %format!("{label}/{name}"),
                error,
                "Certificate store did not open"
            );
            return Err(StoreError::Open);
        }
        let mut ders = Vec::new();
        let mut ctx: *const CERT_CONTEXT = ptr::null();
        let complete;
        loop {
            ctx = unsafe { CertEnumCertificatesInStore(store, ctx) };
            if ctx.is_null() {
                // The API returns null both at the end of the store and on a
                // failure, and the documented end-of-store codes are
                // `CRYPT_E_NOT_FOUND` and, for an external store,
                // `ERROR_NO_MORE_FILES`.
                let error = unsafe { GetLastError() };
                complete = error as i32 == CRYPT_E_NOT_FOUND || error == ERROR_NO_MORE_FILES;
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
            let usage = if with_usage {
                store_usage(ctx)
            } else {
                StoreUsage::Unrestricted
            };
            ders.push((der, usage));
        }
        // Closed on the enumeration's only exit, so every store that opens is
        // released exactly once.
        unsafe { CertCloseStore(store, 0) };
        if complete {
            Ok(ders)
        } else {
            Err(StoreError::Incomplete(ders))
        }
    }

    let mut roots: Vec<(Vec<u8>, StoreUsage)> = Vec::new();
    let mut revoked: Vec<Vec<u8>> = Vec::new();
    let mut read = 0usize;
    // A location whose `Disallowed` store cannot be read while its `ROOT`
    // store returned certificates leaves the revocations of that location
    // unknown, and a root exported against an unknown revocation set is one
    // Windows may have revoked, so the host roots are dropped and the
    // compiled-in set is used instead, filtered by every revocation that was read.
    let mut revocations_known = true;
    for (flag, label) in &locations {
        // The revocations of a location apply to every anchor in the blob,
        // including the compiled-in ones, so `Disallowed` is read wherever it
        // opens and whatever that location's `ROOT` store did. A policy
        // location that revokes a public CA and holds no root of its own is
        // the case that makes the two reads independent.
        let disallowed = read_store(*flag, label, "Disallowed", false);
        let root = read_store(*flag, label, "ROOT", true);

        match disallowed {
            Ok(entries) => revoked.extend(entries.into_iter().map(|(der, _)| der)),
            Err(StoreError::Incomplete(partial)) => {
                tracing::warn!(
                    location = %label,
                    read = partial.len(),
                    "Disallowed store read failed partway, revocations for this location are unknown"
                );
                revoked.extend(partial.into_iter().map(|(der, _)| der));
                revocations_known = false;
            }
            // `CertOpenStore` gives no code for a store that is not
            // provisioned, and a location with no `Disallowed` store at all is
            // ordinary, so the read counts as unknown only where that location
            // exists on the evidence of its `ROOT` store opening.
            Err(StoreError::Open) => {
                if root.is_ok() || matches!(root, Err(StoreError::Incomplete(_))) {
                    tracing::warn!(
                        location = %label,
                        "Disallowed store did not open where the root store did, revocations for this location are unknown"
                    );
                    revocations_known = false;
                }
            }
        }

        match root {
            Ok(entries) => {
                read += entries.len();
                roots.extend(entries);
            }
            Err(StoreError::Incomplete(partial)) => {
                tracing::warn!(
                    location = %label,
                    read = partial.len(),
                    "Root store read failed partway, keeping what it returned"
                );
                read += partial.len();
                roots.extend(partial);
            }
            // Nothing opened here, so this location contributes no anchor.
            Err(StoreError::Open) => {}
        }
    }

    // A root Windows restricts to code signing or timestamping is still a TLS
    // anchor once it is in the blob, and the restriction is recorded in the store
    // entry's enhanced key usage property as often as in the certificate, so
    // both are read.
    let permitted = |usage: &StoreUsage| match usage {
        StoreUsage::Restricted(oids) => oids
            .iter()
            .any(|oid| oid == SERVER_AUTH_OID || oid == ANY_USAGE_OID),
        StoreUsage::Unrestricted => true,
        StoreUsage::Denied => false,
    };
    // A root the store entry keeps from TLS is also in the compiled-in set
    // often enough that the union below would restore it, so what the entry
    // denies is subtracted from the bundle as well.
    let restricted: Vec<Vec<u8>> = roots
        .iter()
        .filter(|(_, usage)| !permitted(usage))
        .map(|(der, _)| der.clone())
        .collect();
    roots.retain(|(_, usage)| permitted(usage));
    let mut roots: Vec<Vec<u8>> = roots.into_iter().map(|(der, _)| der).collect();
    roots.retain(|der| valid_for_tls(der));
    roots.retain(|der| !revoked.contains(der));
    // The host roots go where a revocation store would not read, ∵ a root
    // exported against an unknown revocation set is one Windows may have
    // revoked, and the restrictions collected above still filter the
    // compiled-in set used in their place.
    if !revocations_known {
        roots.clear();
        read = 0;
    }

    // Windows fills `ROOT` on demand, so the store has only the roots this
    // machine has already needed, and the Automatic Root Certificates Update
    // component downloads the rest from Windows Update during verification. An
    // export cannot trigger that download, so the bundle supplies the public
    // CAs the store is missing, minus anything `Disallowed` names.
    let mut bundled = parse_lenient(curl_sys::certs::get_cert_content().as_bytes());
    bundled.retain(|der| !revoked.contains(der) && !restricted.contains(der));
    roots.extend(bundled);

    let ders = dedup_exact(roots);
    if ders.is_empty() {
        return None;
    }

    let (pem, retained) = pem_encode(&ders);
    Some(TrustBundle {
        // The host roots were dropped where a revocation store would not read,
        // so the blob is the compiled-in set filtered by what was read, and the
        // log says so rather than naming a store it no longer represents.
        source: if revocations_known {
            TrustSource::WindowsStores
        } else {
            TrustSource::Bundled
        },
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

    let read = ders.len();
    let ders = dedup_exact(ders);
    if ders.is_empty() {
        return None;
    }

    let (pem, retained) = pem_encode(&ders);
    Some(TrustBundle {
        source: TrustSource::OpensslProbe,
        pem,
        read,
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

    #[cfg(target_os = "macos")]
    mod macos_policy {
        use super::*;
        use security_framework::trust_settings::TrustSettingsForCertificate;

        fn code_signing(cn: &str) -> Vec<u8> {
            let mut eku = ExtendedKeyUsage::new();
            eku.code_signing();
            root(cn, &key(), Some(eku))
        }

        // Apple ships explicit settings beside roots issued for code signing,
        // so the System domain answers to the usage check as it does for an
        // entry with no settings at all.
        #[test]
        fn a_system_entry_restricted_to_code_signing_is_denied_despite_its_setting() {
            let der = code_signing("system-signing");
            assert_eq!(
                decide(true, Ok(Some(TrustSettingsForCertificate::TrustRoot)), &der),
                Decision::Deny
            );
            assert_eq!(decide(true, Ok(None), &der), Decision::Deny);
        }

        // `security-framework` never answers `Unspecified`, it continues its
        // scan and answers `None`, so the System rule is asserted through the
        // value the keychain path actually produces.
        #[test]
        fn an_unspecified_system_entry_arrives_as_none_and_takes_the_usage_check() {
            assert_eq!(
                decide(true, Ok(Some(TrustSettingsForCertificate::Unspecified)), &root("unspecified", &key(), None)),
                Decision::Defer
            );
            assert_eq!(decide(true, Ok(None), &root("plain-system", &key(), None)), Decision::Trust);
        }

        // An administrator naming the policy has decided the question, and the
        // certificate's own usage does not overrule it.
        #[test]
        fn an_admin_entry_restricted_to_code_signing_is_trusted_on_its_setting() {
            let der = code_signing("admin-signing");
            assert_eq!(
                decide(false, Ok(Some(TrustSettingsForCertificate::TrustRoot)), &der),
                Decision::Trust
            );
            assert_eq!(
                decide(false, Ok(Some(TrustSettingsForCertificate::TrustAsRoot)), &der),
                Decision::Trust
            );
        }

        #[test]
        fn a_server_auth_system_entry_is_trusted() {
            let mut eku = ExtendedKeyUsage::new();
            eku.server_auth();
            let der = root("system-tls", &key(), Some(eku));
            assert_eq!(decide(true, Ok(None), &der), Decision::Trust);
            assert_eq!(
                decide(true, Ok(Some(TrustSettingsForCertificate::TrustRoot)), &der),
                Decision::Trust
            );
        }

        // A User anchor beside a System domain whose entries were all denied
        // used to read as a full trust store, so the compiled-in roots stayed
        // out and every public endpoint failed.
        #[test]
        fn a_user_anchor_alone_leaves_the_system_count_at_zero() {
            let system = vec![root("system-denied", &key(), None)];
            let resolved = vec![root("user-trusted", &key(), None)];
            assert_eq!(system_anchor_count(&resolved, &system), 0);
        }

        #[test]
        fn a_retained_system_anchor_is_counted() {
            let der = root("system-kept", &key(), None);
            let system = vec![der.clone()];
            assert_eq!(system_anchor_count(&[der], &system), 1);
        }

        #[test]
        fn a_denial_and_an_unreadable_setting_grant_nothing() {
            let der = root("plain", &key(), None);
            assert_eq!(
                decide(false, Ok(Some(TrustSettingsForCertificate::Deny)), &der),
                Decision::Deny
            );
            assert_eq!(decide(false, Err(()), &der), Decision::Defer);
            assert_eq!(decide(true, Err(()), &der), Decision::Defer);
            assert_eq!(decide(false, Ok(None), &der), Decision::Defer);
        }
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

    // A truncated block ahead of a good one used to swallow it, ∵ the footer
    // search ran past the next header and the pair was parsed as one block.
    #[test]
    fn a_truncated_block_leaves_the_certificate_after_it() {
        let (good, _) = pem_encode(&[root("after", &key(), None)]);
        let mut mixed = b"-----BEGIN CERTIFICATE-----\ntruncated\n".to_vec();
        mixed.extend_from_slice(&good);
        assert_eq!(parse_lenient(&mixed).len(), 1);

        let mut sandwiched = good.clone();
        sandwiched.extend_from_slice(b"-----BEGIN CERTIFICATE-----\ntruncated\n");
        sandwiched.extend_from_slice(&good);
        assert_eq!(parse_lenient(&sandwiched).len(), 2);
    }

    #[test]
    fn a_file_that_parses_to_no_certificate_yields_no_anchor() {
        assert!(parse_lenient(b"# comment only\n").is_empty());
        assert!(parse_lenient(b"-----BEGIN CERTIFICATE-----\ntruncated\n").is_empty());
    }

    // A `ca-certificates.crt` with one malformed entry among many good ones is
    // likelier than a file with nothing parseable in it, and `stack_from_pem`
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

