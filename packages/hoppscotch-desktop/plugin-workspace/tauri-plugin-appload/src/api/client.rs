use std::time::Duration;

use reqwest::{Client as HttpClient, StatusCode, Url};
use serde::de::DeserializeOwned;

use crate::{BundleMetadata, PublicKeyInfo};

use super::{
    error::{ApiError, Result},
    model::ApiResponse,
    API_VERSION,
};

// A bundle download transfers several orders of magnitude more bytes than a
// manifest or key request, so its client gets this multiple of the
// configured timeout.
const DOWNLOAD_TIMEOUT_FACTOR: u32 = 10;

/// HTTP client for one instance server, built with the timeout the host
/// configured through `ApiConfig`.
///
/// The `timeout` field is kept after the client is built because
/// `download_bundle` constructs a second client with its own allowance, and
/// reqwest bakes timeouts in at build time with no way to read one back off
/// a built `Client`.
#[derive(Debug, Clone)]
pub struct ApiClient {
    client: HttpClient,
    base_url: Url,
    timeout: Duration,
}

impl ApiClient {
    pub fn new(base_url: impl AsRef<str>, timeout: Duration) -> Result<Self> {
        tracing::info!(
            base_url = base_url.as_ref(),
            ?timeout,
            "Initializing ApiClient"
        );

        let client = HttpClient::builder()
            .timeout(timeout)
            .user_agent(Self::user_agent())
            .build()
            .map_err(ApiError::RequestFailed)?;

        Ok(Self {
            client,
            base_url: base_url.as_ref().parse().map_err(ApiError::InvalidUrl)?,
            timeout,
        })
    }

    fn user_agent() -> String {
        format!(
            "{}/{}",
            env!("CARGO_PKG_NAME"),
            env!("CARGO_PKG_VERSION")
        )
    }

    pub async fn list_key(&self) -> Result<PublicKeyInfo> {
        self.get(&format!("/api/{API_VERSION}/key")).await
    }

    // NOTE: Right now this is fetching whatever is listed,
    // but if there are more than one bundle per SH instance,
    // this is where the changes should be made.
    pub async fn fetch_bundle_metadata(&self, name: &str) -> Result<BundleMetadata> {
        tracing::debug!(bundle_name = name, "Fetching metadata");
        self.get(&format!("/api/{API_VERSION}/manifest")).await
    }

    pub async fn download_bundle(&self, name: &str) -> Result<Vec<u8>> {
        tracing::debug!(bundle_name = name, "Downloading bundle");
        let url = self.build_url(&format!("/api/{API_VERSION}/bundle"))?;

        let download_client = HttpClient::builder()
            .timeout(DOWNLOAD_TIMEOUT_FACTOR * self.timeout)
            .user_agent(Self::user_agent())
            .build()
            .map_err(ApiError::RequestFailed)?;

        let response = download_client.get(url).send().await.map_err(|e| {
            tracing::error!(bundle_name = name, error = %e, "Download request failed");
            ApiError::RequestFailed(e)
        })?;

        match response.status() {
            StatusCode::OK => {
                tracing::debug!(bundle_name = name, "Download successful");
                Ok(response.bytes().await?.to_vec())
            }
            StatusCode::NOT_FOUND => {
                tracing::warn!(bundle_name = name, "Bundle not found");
                Err(ApiError::BundleNotFound(name.to_string()))
            }
            status => {
                let error_text = response.text().await.unwrap_or_default();
                tracing::error!(bundle_name = name, status = %status, error = %error_text, "Download failed");
                Err(ApiError::from_status(status.as_u16(), error_text))
            }
        }
    }

    async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        tracing::debug!(path, "Sending GET request");
        let url = self.build_url(path)?;

        let response = self.client.get(url).send().await.map_err(|e| {
            tracing::error!(path, error = %e, "Request failed");
            ApiError::RequestFailed(e)
        })?;

        match response.status() {
            StatusCode::OK => {
                let api_response: ApiResponse<T> = response.json().await?;
                if api_response.success {
                    Ok(api_response.data)
                } else {
                    Err(ApiError::ServerError {
                        status: 200,
                        message: api_response.error.unwrap_or_else(|| "Unknown error".into()),
                    })
                }
            }
            StatusCode::NOT_FOUND => Err(ApiError::BundleNotFound(path.to_string())),
            status => {
                let error_text = response.text().await.unwrap_or_default();
                tracing::error!(path, status = %status, error = %error_text, "Request failed");
                Err(ApiError::from_status(status.as_u16(), error_text))
            }
        }
    }

    fn build_url(&self, path: &str) -> Result<Url> {
        let path_to_join = path.trim_start_matches('/');

        let mut base = self.base_url.clone();
        if !base.path().ends_with('/') {
            base.set_path(&format!("{}/", base.path()));
        }

        base.join(path_to_join).map_err(|e| {
            tracing::error!(path, error = %e, "Invalid URL");
            ApiError::InvalidUrl(e)
        })
    }
}
