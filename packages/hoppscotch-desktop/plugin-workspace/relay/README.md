# Relay

A HTTP request-response relay used by Hoppscotch Desktop and Hoppscotch Agent for more advanced request handling including custom headers, certificates, proxies, and local system integration.

> [!IMPORTANT]
> This crate is only available via GitHub and not published on crates.io right now.

<div align="center">

![GitHub License MIT](https://img.shields.io/github/license/CuriousCorrelation/relay)
[![Rust](https://img.shields.io/badge/Rust-1.77.2+-orange)](https://www.rust-lang.org)

</div>

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
relay = { git = "https://github.com/CuriousCorrelation/relay.git" }
```

## Features

- 🦀 Blazingly fast!
- HTTP client built on libcurl
- HTTP/1.1, HTTP/2.0, HTTP/3.0 support
- Security with SSL/TLS certificate management
- Proxy support with authentication
- Multiple authentication methods (Basic, Bearer, Digest)
- Content handling (JSON, Form Data, Binary)
- Custom security configurations
- Async request execution with cancellation support

## Usage

```rust
use relay::{Request, Response, execute};

let request = Request {
    id: 1,
    url: "https://api.example.com".to_string(),
    method: Method::Get,
    version: Version::Http2,
    // ... configure other options
};

let response = execute(request).await?;
```

> [!NOTE]
> All requests are executed asynchronously and can be cancelled using the `cancel(request_id)` function.

## Security Features

> [!TIP]
> You can configure certificate validation, host verification, and custom certificates:

```rust
let security_config = SecurityConfig {
    validate_certificates: Some(true),
    verify_host: Some(true),
    certificates: Some(CertificateConfig {
        client: Some(CertificateType::Pem { 
            cert: cert_data,
            key: key_data 
        }),
        ca: Some(vec![ca_cert_data])
    })
};
```

## Error Handling

The crate uses a custom error type `RelayError` that provides information about failures:

```rust
#[derive(Error)]
pub enum RelayError {
    Network { message: String, cause: Option<String> },
    Certificate { message: String, cause: Option<String> },
    Parse { message: String, cause: Option<String> },
    // ... other variants
}
```

## Checking the Windows Trust Reader From Another Host

`src/trust.rs` reads the Windows certificate stores through `crypt32`, and a
macOS or Linux host compiles none of it, so a name that does not exist in
`windows-sys` is invisible until a Windows build runs. `cargo check --target
x86_64-pc-windows-msvc` does not answer it either, since the vendored OpenSSL
build script cannot configure for that target from a host whose `perl` writes
POSIX paths.

The module is checked by copying the `#[cfg(target_os = "windows")]`
`read_platform` into a crate that depends on `windows-sys`, with the same
features this crate takes, and on `tracing` for the warnings the module
writes. The copy stubs `TrustBundle`, `TrustSource`, `valid_for_tls`,
`parse_lenient`, `dedup_exact`, `pem_encode` and
`curl_sys::certs::get_cert_content`, since none of them is what the check is
for, then runs

```
cargo check --target x86_64-pc-windows-msvc -Zbuild-std=std,panic_abort
```

which needs a nightly toolchain with `rust-src` and no Windows SDK, since a
check never links. That is how the reader's four wrong `windows-sys` names were
found on 2026-09-28, `CERT_ENHKEY_USAGE`, which the crate spells `CTL_USAGE`,
and the three location constants that exist only as unshifted identifiers.

## Requirements

- Rust 1.77.2 or later
- OpenSSL development libraries
- libcurl with SSL and HTTP/2.0 support

> [!WARNING]
> This crate uses custom forks of some dependencies for NTLM support and consistent OpenSSL backend across platforms.

## License

Code: (c) 2024 - CuriousCorrelation

MIT or MIT/Apache 2.0 where applicable.
