use dashmap::DashMap;
use reqwest::{header::{HeaderMap, HeaderName, HeaderValue}, Certificate, ClientBuilder, Identity};
use serde::{Deserialize, Serialize};
use tauri::{plugin::{Builder, TauriPlugin}, Manager, Runtime, State};
use tokio_util::sync::CancellationToken;

#[derive(Default)]
struct InterceptorState {
  cancellation_tokens: DashMap<usize, CancellationToken>
}

#[derive(Debug, Serialize, Deserialize)]
struct KeyValuePair {
  key: String,
  value: String
}

#[derive(Debug, Deserialize)]
enum FormDataValue {
  Text(String),
  File {
    filename: String,
    data: Vec<u8>,
    mime: String
  }
}

#[derive(Debug, Deserialize)]
struct FormDataEntry {
  key: String,
  value: FormDataValue
}

#[derive(Debug, Deserialize)]
enum BodyDef {
  Text(String),
  URLEncoded(Vec<KeyValuePair>),
  FormData(Vec<FormDataEntry>)
}

#[derive(Debug, Deserialize)]
enum ClientCertDef {
  PEMCert {
    certificate_pem: Vec<u8>,
    key_pem: Vec<u8>
  },

  PFXCert {
    certificate_pfx: Vec<u8>,
    password: String
  }
}

#[derive(Debug, Deserialize)]
struct RequestDef {
  req_id: usize,

  method: String,
  endpoint: String,

  parameters: Vec<KeyValuePair>,
  headers: Vec<KeyValuePair>,

  body: Option<BodyDef>,

  validate_certs: bool,
  root_cert_bundle_files: Vec<Vec<u8>>,
  client_cert: Option<ClientCertDef>
}

fn get_identity_from_req(req: &RequestDef) -> Result<Option<Identity>, reqwest::Error> {
  let result = match &req.client_cert {
    None => return Ok(None),
    Some(ClientCertDef::PEMCert { certificate_pem, key_pem }) => Identity::from_pkcs8_pem(&certificate_pem, &key_pem),
    Some(ClientCertDef::PFXCert { certificate_pfx, password }) => Identity::from_pkcs12_der(&certificate_pfx, &password)
  };

  Ok(Some(result?))
}

fn parse_root_certs(req: &RequestDef) -> Result<Vec<Certificate>, reqwest::Error> {
  let mut result = vec![];

  for cert_bundle_file in &req.root_cert_bundle_files {
    let mut certs = Certificate::from_pem_bundle(&cert_bundle_file)?;
    result.append(&mut certs);
  }

  Ok(result)
}

enum ReqBodyAction {
  Body(reqwest::Body),
  UrlEncodedForm(Vec<(String, String)>),
  MultipartForm(reqwest::multipart::Form)
}

fn convert_bodydef_to_req_action(req: &RequestDef) -> Option<ReqBodyAction> {
  match &req.body {
    None => None,
    Some(BodyDef::Text(text)) => Some(ReqBodyAction::Body(text.clone().into())),
    Some(BodyDef::URLEncoded(entries)) =>
    Some(
      ReqBodyAction::UrlEncodedForm(
        entries.iter()
          .map(|KeyValuePair { key, value }| (key.clone(), value.clone()))
          .collect()
      )
    ),
    Some(BodyDef::FormData(entries)) => {
      let mut form = reqwest::multipart::Form::new();

      for entry in entries {
        form = match &entry.value {
          FormDataValue::Text(value) => form.text(entry.key.clone(), value.clone()),
          FormDataValue::File { filename, data, mime } =>
          form.part(
            entry.key.clone(),
            reqwest::multipart::Part::bytes(data.clone())
              .file_name(filename.clone())
              .mime_str(mime.as_str()).expect("Error while setting File enum")
          ),
        }
      }

      Some(ReqBodyAction::MultipartForm(form))
    }
  }
}

#[derive(Serialize)]
struct RunRequestResponse {
  status: u16,
  status_text: String,
  headers: Vec<KeyValuePair>,
  data: Vec<u8>,

  time_start_ms: u128,
  time_end_ms: u128
}

#[derive(Serialize)]
enum RunRequestError {
  RequestCancelled,
  ClientCertError,
  RootCertError,
  InvalidMethod,
  InvalidUrl,
  InvalidHeaders,
  RequestRunError(String)
}

async fn execute_request(req_builder: reqwest::RequestBuilder) -> Result<RunRequestResponse, RunRequestError> {
  let start_time_ms = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap()
    .as_millis();

  let response = req_builder.send()
    .await
    .map_err(|err| RunRequestError::RequestRunError(err.to_string()))?;

  // We hold on to these values becase we lose ownership of response
  // when we read the body
  let res_status = response.status();
  let res_headers = response.headers().clone();


  let res_body_bytes = response.bytes()
    .await
    .map_err(|err| RunRequestError::RequestRunError(err.to_string()))?;

  // Reqwest resolves the send before all the response is loaded, to keep the timing
  // correctly, we load the response as well.
  let end_time_ms = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap()
    .as_millis();

  let response_status = res_status.as_u16();
  let response_status_text = res_status
      .canonical_reason()
      .unwrap_or("Unknown Status")
      .to_owned();

  let response_headers = res_headers
    .iter()
    .map(|(key, value)|
      KeyValuePair {
        key: key.as_str().to_owned(),
        value: value.to_str().unwrap_or("").to_owned()
      }
    )
    .collect();

  Ok(
    RunRequestResponse {
      status: response_status,
      status_text: response_status_text,
      headers: response_headers,
      data: res_body_bytes.into(),
      time_start_ms: start_time_ms,
      time_end_ms: end_time_ms
    }
  )
}

#[tauri::command]
async fn run_request(req: RequestDef, state: State<'_, InterceptorState>) -> Result<RunRequestResponse, RunRequestError> {
  let method = reqwest::Method::from_bytes(req.method.as_bytes())
    .map_err(|_| RunRequestError::InvalidMethod)?;

  let endpoint_url = reqwest::Url::parse(&req.endpoint)
    .map_err(|_| RunRequestError::InvalidUrl)?;

  let headers = req.headers
    .iter()
    .map(|KeyValuePair { key, value }|
      Ok(
        (
          key.parse::<HeaderName>().map_err(|_| ())?,
          value.parse::<HeaderValue>().map_err(|_| ())?
        )
      )
    )
    .collect::<Result<HeaderMap, ()>>()
    .map_err(|_| RunRequestError::InvalidHeaders)?;

  let body_action = convert_bodydef_to_req_action(&req);

  let client_identity = get_identity_from_req(&req)
    .map_err(|_| RunRequestError::ClientCertError)?;

  let root_certs = parse_root_certs(&req)
    .map_err(|_| RunRequestError::RootCertError)?;

  let mut client_builder = ClientBuilder::new()
    .danger_accept_invalid_certs(!req.validate_certs);

  // NOTE: Root Certificates are not currently implemented into the Hoppscotch UI
  // This is done so as the current mechanism doesn't allow for v1 X.509 certificates
  // to be accepted. Reqwest supports `native-tls` and `rustls`.
  // `native-tls` should support v1 X.509 in Linux [OpenSSL] (and hopefully on Win [SChannel]), but on
  // macOS the Security Framework system in it blocks certiticates pretty harshly and blocks v1.
  // `rustls` doesn't allow v1 x.509 as well as documented here: https://github.com/rustls/webpki/issues/29
  // We will fully introduce the feature when the dilemma is solved (or demand is voiced), until
  // then, disabling SSL verification should yield same results
  for root_cert in root_certs {
    client_builder = client_builder.add_root_certificate(root_cert);
  }

  if let Some(identity) = client_identity {
    client_builder = client_builder.identity(identity);
  }

  let client = client_builder.build()
    .expect("TLS Backend couldn't be initialized");

  let mut req_builder = client.request(method, endpoint_url)
    .query(
      &req.parameters
        .iter()
        .map(|KeyValuePair { key, value }| (key, value))
        .collect::<Vec<_>>()
    )
    .headers(headers);

  req_builder = match body_action {
    None => req_builder,
    Some(ReqBodyAction::Body(body)) => req_builder.body(body),
    Some(ReqBodyAction::UrlEncodedForm(entries)) => req_builder.form(&entries),
    Some(ReqBodyAction::MultipartForm(form)) => req_builder.multipart(form)
  };

  let cancel_token = CancellationToken::new();

  // NOTE: This will drop reference to an existing cancellation token
  // if you send a request with the same request id as an existing one,
  // thereby, dropping any means to cancel a running operation with the old token.
  // This is done so because, on FE side, we may lose cancel token info upon reloads
  // and this allows us to work around that.
  state.cancellation_tokens.insert(req.req_id, cancel_token.clone());

  // Races between whether cancellation happened or requext execution happened
  let result = tokio::select! {
    _ = cancel_token.cancelled() => { None },
    result = execute_request(req_builder) => {
      // Remove cancellation token since the request has now completed
      state.cancellation_tokens.remove(&req.req_id);

      Some(result)
    }
  };

  result
    .unwrap_or(Err(RunRequestError::RequestCancelled))
}

#[tauri::command]
fn cancel_request(req_id: usize, state: State<'_, InterceptorState>) {
  if let Some((_, cancel_token)) = state.cancellation_tokens.remove(&req_id) {
    cancel_token.cancel();
  }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("hopp_native_interceptor")
    .invoke_handler(
      tauri::generate_handler![
        run_request,
        cancel_request
      ]
    )
    .setup(|app_handle| {
      app_handle.manage(InterceptorState::default());

      Ok(())
    })
    .build()
}
