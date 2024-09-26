use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HandshakeResponse {
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegistrationReceiveRequest {
    pub registration: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfirmedRegistrationRequest {
    pub registration: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthKeyResponse {
    pub auth_key: String,
    pub expiry: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KeyValuePair {
    pub key: String,
    pub value: String,
}

pub enum ReqBodyAction {
    Body(reqwest::Body),
    UrlEncodedForm(Vec<(String, String)>),
    MultipartForm(reqwest::multipart::Form),
}

#[derive(Debug, Deserialize)]
pub enum FormDataValue {
    Text(String),
    File {
        filename: String,
        data: Vec<u8>,
        mime: String,
    },
}

#[derive(Debug, Deserialize)]
pub struct FormDataEntry {
    pub key: String,
    pub value: FormDataValue,
}

#[derive(Debug, Deserialize)]
pub enum BodyDef {
    Text(String),
    URLEncoded(Vec<KeyValuePair>),
    FormData(Vec<FormDataEntry>),
}

#[derive(Debug, Deserialize)]
pub struct RequestDef {
    pub req_id: usize,
    pub method: String,
    pub endpoint: String,
    pub parameters: Vec<KeyValuePair>,
    pub headers: Vec<KeyValuePair>,
    pub body: Option<BodyDef>,
    pub validate_certs: bool,
    pub root_cert_bundle_files: Vec<Vec<u8>>,
    pub client_cert: Option<ClientCertDef>,
}

#[derive(Debug, Deserialize)]
pub enum ClientCertDef {
    PEMCert {
        certificate_pem: Vec<u8>,
        key_pem: Vec<u8>,
    },
    PFXCert {
        certificate_pfx: Vec<u8>,
        password: String,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunRequestResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<KeyValuePair>,
    pub data: Vec<u8>,
    pub time_start_ms: u128,
    pub time_end_ms: u128,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum RunRequestError {
    InternalError,
    Unauthorized,
    RequestCancelled,
    ClientCertError,
    RootCertError,
    InvalidMethod,
    InvalidUrl,
    InvalidHeaders,
    RequestRunError(String),
}

impl warp::reject::Reject for RunRequestError {}
