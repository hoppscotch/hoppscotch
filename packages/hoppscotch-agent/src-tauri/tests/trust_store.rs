//! Requests through `relay::execute` against a TLS server whose certificate
//! chains to a CA generated for the test, which no host trust store has, so
//! the request validates only when it lists that CA, matching what the app
//! sends from its certificate settings.

use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicI64, Ordering};
use std::thread;

use openssl::asn1::Asn1Time;
use openssl::bn::{BigNum, MsbOption};
use openssl::hash::MessageDigest;
use openssl::pkey::{PKey, Private};
use openssl::rsa::Rsa;
use openssl::ssl::{SslAcceptor, SslMethod};
use openssl::x509::extension::{
    BasicConstraints, ExtendedKeyUsage, KeyUsage, SubjectAlternativeName,
};
use openssl::x509::{X509Name, X509};
use serde_json::json;

const PUBLIC_ENDPOINT: &str = "https://valid-isrgrootx2.letsencrypt.org/";

// `relay` tracks in-flight requests by id, so every request in this binary
// takes its own.
static NEXT_ID: AtomicI64 = AtomicI64::new(1);

struct Pki {
    ca_pem: Vec<u8>,
    leaf: X509,
    leaf_key: PKey<Private>,
}

fn key() -> PKey<Private> {
    PKey::from_rsa(Rsa::generate(2048).expect("rsa")).expect("pkey")
}

fn serial() -> openssl::asn1::Asn1Integer {
    let mut bn = BigNum::new().expect("bignum");
    bn.rand(64, MsbOption::MAYBE_ZERO, false)
        .expect("random serial");
    bn.to_asn1_integer().expect("serial")
}

fn name(cn: &str) -> X509Name {
    let mut name = X509Name::builder().expect("name builder");
    name.append_entry_by_text("CN", cn).expect("cn");
    name.build()
}

fn pki() -> Pki {
    let ca_key = key();
    let ca_name = name("hoppscotch-agent test CA");
    let mut ca = X509::builder().expect("ca builder");
    ca.set_version(2).expect("version");
    ca.set_serial_number(&serial()).expect("serial");
    ca.set_subject_name(&ca_name).expect("subject");
    ca.set_issuer_name(&ca_name).expect("issuer");
    ca.set_pubkey(&ca_key).expect("pubkey");
    ca.set_not_before(&Asn1Time::days_from_now(0).expect("now"))
        .expect("not before");
    ca.set_not_after(&Asn1Time::days_from_now(30).expect("later"))
        .expect("not after");
    ca.append_extension(BasicConstraints::new().critical().ca().build().expect("bc"))
        .expect("append bc");
    ca.append_extension(
        KeyUsage::new()
            .critical()
            .key_cert_sign()
            .crl_sign()
            .build()
            .expect("ku"),
    )
    .expect("append ku");
    ca.sign(&ca_key, MessageDigest::sha256()).expect("sign ca");
    let ca = ca.build();

    let leaf_key = key();
    let mut leaf = X509::builder().expect("leaf builder");
    leaf.set_version(2).expect("version");
    leaf.set_serial_number(&serial()).expect("serial");
    leaf.set_subject_name(&name("127.0.0.1")).expect("subject");
    leaf.set_issuer_name(ca.subject_name()).expect("issuer");
    leaf.set_pubkey(&leaf_key).expect("pubkey");
    leaf.set_not_before(&Asn1Time::days_from_now(0).expect("now"))
        .expect("not before");
    leaf.set_not_after(&Asn1Time::days_from_now(30).expect("later"))
        .expect("not after");
    leaf.append_extension(BasicConstraints::new().build().expect("bc"))
        .expect("append bc");
    leaf.append_extension(
        KeyUsage::new()
            .critical()
            .digital_signature()
            .key_encipherment()
            .build()
            .expect("ku"),
    )
    .expect("append ku");
    leaf.append_extension(ExtendedKeyUsage::new().server_auth().build().expect("eku"))
        .expect("append eku");
    let san = SubjectAlternativeName::new()
        .ip("127.0.0.1")
        .build(&leaf.x509v3_context(Some(&ca), None))
        .expect("san");
    leaf.append_extension(san).expect("append san");
    leaf.sign(&ca_key, MessageDigest::sha256())
        .expect("sign leaf");

    Pki {
        ca_pem: ca.to_pem().expect("ca pem"),
        leaf: leaf.build(),
        leaf_key,
    }
}

/// Serves `200 ok` on every accepted connection until the test binary exits,
/// and returns the port it listens on.
fn serve(pki: &Pki) -> u16 {
    let mut acceptor = SslAcceptor::mozilla_intermediate(SslMethod::tls()).expect("acceptor");
    acceptor
        .set_private_key(&pki.leaf_key)
        .expect("private key");
    acceptor.set_certificate(&pki.leaf).expect("certificate");
    let acceptor = acceptor.build();

    let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
    let port = listener.local_addr().expect("addr").port();
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            // The client aborts the handshake when it rejects the CA, which
            // ends that connection and leaves the listener accepting.
            let Ok(mut tls) = acceptor.accept(stream) else {
                continue;
            };
            let mut buf = [0u8; 4096];
            let mut seen = Vec::new();
            while !seen.windows(4).any(|w| w == b"\r\n\r\n") {
                match tls.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => seen.extend_from_slice(&buf[..n]),
                }
            }
            let _ = tls.write_all(
                b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok",
            );
            let _ = tls.shutdown();
        }
    });
    port
}

/// Builds a request with no security block. The app's interceptors always
/// attach one, so this is the shape another client of the agent's HTTP API
/// sends, and it configured no trust at all until `relay` applied the host
/// anchors on that arm too.
fn plain_request(url: &str) -> relay::Request {
    serde_json::from_value(json!({
        "id": NEXT_ID.fetch_add(1, Ordering::SeqCst),
        "url": url,
        "method": "GET",
        "version": "HTTP/1.1",
    }))
    .expect("request json")
}

/// Builds the request the way the app serializes it, with `ca` as the
/// certificate settings' CA list.
fn request(url: &str, ca: Option<Vec<Vec<u8>>>) -> relay::Request {
    serde_json::from_value(json!({
        "id": NEXT_ID.fetch_add(1, Ordering::SeqCst),
        "url": url,
        "method": "GET",
        "version": "HTTP/1.1",
        "security": {
            "certificates": { "client": null, "ca": ca },
            "verifyHost": true,
            "verifyPeer": true,
        },
    }))
    .expect("request json")
}

#[tokio::test]
async fn a_server_signed_by_an_unknown_ca_is_rejected() {
    let pki = pki();
    let port = serve(&pki);

    let result = relay::execute(request(&format!("https://127.0.0.1:{port}/"), None)).await;

    let error = result.expect_err("a CA outside every trust store");
    let text = format!("{error:?}");
    assert!(
        text.contains("certificate") || text.contains("SSL"),
        "the error names the verification failure, got {text}"
    );
}

#[tokio::test]
async fn a_request_without_security_settings_is_rejected_by_the_same_ca() {
    let pki = pki();
    let port = serve(&pki);

    let error = relay::execute(plain_request(&format!("https://127.0.0.1:{port}/")))
        .await
        .expect_err("a CA outside every trust store");

    let text = format!("{error:?}");
    assert!(
        text.contains("certificate") || text.contains("SSL"),
        "the error names the verification failure, got {text}"
    );
}

#[tokio::test]
async fn a_ca_from_the_certificate_settings_validates_the_server() {
    let pki = pki();
    let port = serve(&pki);

    let response = relay::execute(request(
        &format!("https://127.0.0.1:{port}/"),
        Some(vec![pki.ca_pem.clone()]),
    ))
    .await
    .expect("request with the CA configured");

    assert_eq!(response.status.as_u16(), 200);
    assert_eq!(&response.body.body[..], b"ok");
}

#[tokio::test]
async fn a_ca_entry_that_is_not_pem_is_refused_by_its_index() {
    let pki = pki();
    let port = serve(&pki);

    let error = relay::execute(request(
        &format!("https://127.0.0.1:{port}/"),
        Some(vec![pki.ca_pem.clone(), b"not a certificate".to_vec()]),
    ))
    .await
    .expect_err("an unparseable CA entry");

    assert!(
        format!("{error:?}").contains("index 1"),
        "the error names the entry that failed to parse, got {error:?}"
    );
}

// The endpoint chains to ISRG Root X2, which the macOS keychain has and the
// LibreSSL `/etc/ssl/cert.pem` snapshot is missing, so on macOS this passes
// only when `relay` read the keychain.
#[tokio::test]
#[ignore = "network"]
async fn a_public_endpoint_validates_against_the_host_trust_store() {
    let response = relay::execute(request(PUBLIC_ENDPOINT, None))
        .await
        .expect("request with no CA configured");

    assert_eq!(response.status.as_u16(), 200);
}

// A client of the agent's HTTP API that sends no security block reached curl
// with whatever CA path the probe resolved, which on macOS is the file that
// omits ISRG Root X2, so this is the assertion for that arm.
#[tokio::test]
#[ignore = "network"]
async fn a_request_without_security_settings_uses_the_host_trust_store() {
    let response = relay::execute(plain_request(PUBLIC_ENDPOINT))
        .await
        .expect("request with no security settings");

    assert_eq!(response.status.as_u16(), 200);
}

// Adding a CA extends the host trust store, so a public endpoint unrelated to
// the private CA validates as well.
#[tokio::test]
#[ignore = "network"]
async fn a_configured_ca_keeps_the_host_trust_store() {
    let pki = pki();

    let response = relay::execute(request(PUBLIC_ENDPOINT, Some(vec![pki.ca_pem])))
        .await
        .expect("request with an unrelated CA configured");

    assert_eq!(response.status.as_u16(), 200);
}
