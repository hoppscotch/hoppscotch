use reqwest::{header::{HeaderMap, HeaderName, HeaderValue}, Certificate, ClientBuilder, Identity};
use serde::{Deserialize, Serialize};
use tauri::{plugin::{Builder, TauriPlugin}, Runtime};


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
    data: Vec<u8>
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
  method: String,
  endpoint: String,

  parameters: Vec<KeyValuePair>,
  headers: Vec<KeyValuePair>,

  body: Option<BodyDef>,

  validate_certs: bool,
  root_certs_pems: Vec<Vec<u8>>,
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
  req.root_certs_pems
    .iter()
    .map(|pem| Certificate::from_pem(pem))
    .collect()
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
          FormDataValue::File { filename, data } =>
          form.part(
            entry.key.clone(),
            reqwest::multipart::Part::bytes(data.clone())
              .file_name(filename.clone())
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
  ClientCertError,
  RootCertError,
  InvalidMethod,
  InvalidUrl,
  InvalidHeaders,
  RequestRunError(String)
}

#[tauri::command]
async fn run_request(req: RequestDef) -> Result<RunRequestResponse, RunRequestError> {
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


pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("hopp_native_interceptor")
    .invoke_handler(
      tauri::generate_handler![
        run_request
      ]
    )
    .build()
}
