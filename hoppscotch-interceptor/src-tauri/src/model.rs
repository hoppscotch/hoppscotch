use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};
use tokio_util::sync::CancellationToken;

#[derive(Default)]
pub(crate) struct AppState {
    pub(crate) auth_keys: RwLock<HashMap<String, String>>,
    pub(crate) registration_key: RwLock<Option<String>>,
    pub(crate) cancellation_tokens: RwLock<HashMap<usize, CancellationToken>>,
}

impl AppState {
    pub(crate) fn new() -> Arc<Self> {
        Arc::new(Self {
            auth_keys: RwLock::new(HashMap::new()),
            registration_key: RwLock::new(None),
            cancellation_tokens: RwLock::new(HashMap::new()),
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct KeyValuePair {
    pub(crate) key: String,
    pub(crate) value: String,
}

pub(crate) enum ReqBodyAction {
    Body(reqwest::Body),
    UrlEncodedForm(Vec<(String, String)>),
    MultipartForm(reqwest::multipart::Form),
}

#[derive(Debug, Deserialize)]
pub(crate) enum FormDataValue {
    Text(String),
    File {
        filename: String,
        data: Vec<u8>,
        mime: String,
    },
}

#[derive(Debug, Deserialize)]
pub(crate) struct FormDataEntry {
    pub(crate) key: String,
    pub(crate) value: FormDataValue,
}

#[derive(Debug, Deserialize)]
pub(crate) enum BodyDef {
    Text(String),
    URLEncoded(Vec<KeyValuePair>),
    FormData(Vec<FormDataEntry>),
}

#[derive(Debug, Deserialize)]
pub(crate) struct RequestDef {
    pub(crate) req_id: usize,
    pub(crate) method: String,
    pub(crate) endpoint: String,
    pub(crate) parameters: Vec<KeyValuePair>,
    pub(crate) headers: Vec<KeyValuePair>,
    pub(crate) body: Option<BodyDef>,
    pub(crate) validate_certs: bool,
    pub(crate) root_cert_bundle_files: Vec<Vec<u8>>,
    pub(crate) client_cert: Option<ClientCertDef>,
}

#[derive(Debug, Deserialize)]
pub(crate) enum ClientCertDef {
    PEMCert {
        certificate_pem: Vec<u8>,
        key_pem: Vec<u8>,
    },
    PFXCert {
        certificate_pfx: Vec<u8>,
        password: String,
    },
}

#[derive(Debug, Serialize)]
pub(crate) struct RunRequestResponse {
    pub(crate) status: u16,
    pub(crate) status_text: String,
    pub(crate) headers: Vec<KeyValuePair>,
    pub(crate) data: Vec<u8>,
    pub(crate) time_start_ms: u128,
    pub(crate) time_end_ms: u128,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) enum RunRequestError {
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
