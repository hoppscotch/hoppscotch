use aes_gcm::{aead::Aead, AeadCore, Aes256Gcm, KeyInit};
use axum::{body::Body, response::{IntoResponse, Response}};
use rand::rngs::OsRng;
use serde::Serialize;

pub(crate) fn get_status_text(status: u16) -> &'static str {
    match status {
        100 => "Continue",
        101 => "Switching Protocols",
        102 => "Processing",
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        203 => "Non-Authoritative Information",
        204 => "No Content",
        205 => "Reset Content",
        206 => "Partial Content",
        300 => "Multiple Choices",
        301 => "Moved Permanently",
        302 => "Found",
        303 => "See Other",
        304 => "Not Modified",
        305 => "Use Proxy",
        307 => "Temporary Redirect",
        400 => "Bad Request",
        401 => "Unauthorized",
        402 => "Payment Required",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        406 => "Not Acceptable",
        407 => "Proxy Authentication Required",
        408 => "Request Timeout",
        409 => "Conflict",
        410 => "Gone",
        411 => "Length Required",
        412 => "Precondition Failed",
        413 => "Payload Too Large",
        414 => "URI Too Long",
        415 => "Unsupported Media Type",
        416 => "Range Not Satisfiable",
        417 => "Expectation Failed",
        418 => "I'm a teapot",
        422 => "Unprocessable Entity",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        501 => "Not Implemented",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        505 => "HTTP Version Not Supported",
        _ => "Unknown Status",
    }
}

#[derive(Debug)]
pub struct EncryptedJson<T: Serialize> {
  pub key_b16: String,
  pub data: T
}

impl<T> IntoResponse for EncryptedJson<T> where T: Serialize {
    fn into_response(self) -> Response {
      let serialized_response = serde_json::to_vec(&self.data)
        .expect("Failed serializing response to vec for encryption");

      let key: [u8; 32] = base16::decode(&self.key_b16)
          .unwrap()
          [0..32]
          .try_into()
          .unwrap();

      let cipher = Aes256Gcm::new(&key.into());

      let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

      let nonce_b16 = base16::encode_lower(&nonce);

      let encrypted_response = cipher.encrypt(&nonce, serialized_response.as_slice())
        .expect("Failed encrypting response");

      let mut response = Response::new(Body::from(encrypted_response));
      let response_headers = response.headers_mut();

      response_headers.insert("Content-Type", "application/octet-stream".parse().unwrap());
      response_headers.insert("X-Hopp-Nonce", nonce_b16.parse().unwrap());

      response
    }
}
