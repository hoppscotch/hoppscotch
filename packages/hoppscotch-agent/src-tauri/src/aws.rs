use std::sync::Arc;

use axum::{
    body::Bytes,
    extract::State,
    http::HeaderMap,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use tauri::AppHandle;

use aws_credential_types::provider::ProvideCredentials;

use crate::{
    error::{AgentError, AgentResult},
    global::NONCE,
    model::{AwsCredentialsResponse, AwsProfilesResponse, AwsResolveRequest},
    state::AppState,
    util::EncryptedJson,
};

/// GET /aws/profiles — list AWS profile names from ~/.aws/config and ~/.aws/credentials
#[tracing::instrument(skip(state, _app_handle))]
pub async fn list_profiles(
    State((state, _app_handle)): State<(Arc<AppState>, AppHandle)>,
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>,
) -> AgentResult<EncryptedJson<AwsProfilesResponse>> {
    let token = auth_header.token();

    let reg_info = state
        .get_registration(token)
        .ok_or(AgentError::Unauthorized)?;

    let mut profiles = Vec::new();

    // Parse ~/.aws/credentials for profile sections
    if let Some(home) = dirs::home_dir() {
        let credentials_path = home.join(".aws").join("credentials");
        if let Ok(contents) = tokio::fs::read_to_string(&credentials_path).await {
            for line in contents.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('[') && trimmed.ends_with(']') {
                    let name = trimmed[1..trimmed.len() - 1].trim();
                    if !name.is_empty() {
                        profiles.push(name.to_string());
                    }
                }
            }
        }

        // Parse ~/.aws/config for profile sections (prefixed with "profile ")
        let config_path = home.join(".aws").join("config");
        if let Ok(contents) = tokio::fs::read_to_string(&config_path).await {
            for line in contents.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('[') && trimmed.ends_with(']') {
                    let section = trimmed[1..trimmed.len() - 1].trim();
                    let name = if let Some(stripped) = section.strip_prefix("profile ") {
                        stripped.trim()
                    } else if section == "default" {
                        section
                    } else {
                        continue;
                    };
                    if !name.is_empty() {
                        profiles.push(name.to_string());
                    }
                }
            }
        }
    }

    profiles.sort();
    profiles.dedup();

    tracing::info!(count = profiles.len(), "Listed AWS profiles");

    Ok(EncryptedJson {
        key_b16: reg_info.shared_secret_b16,
        data: AwsProfilesResponse { profiles },
    })
}

/// POST /aws/resolve-credentials — resolve an AWS profile to temporary credentials
#[tracing::instrument(skip(state, body, _app_handle))]
pub async fn resolve_credentials(
    State((state, _app_handle)): State<(Arc<AppState>, AppHandle)>,
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>,
    headers: HeaderMap,
    body: Bytes,
) -> AgentResult<EncryptedJson<AwsCredentialsResponse>> {
    let nonce = match headers.get(NONCE) {
        Some(n) => match n.to_str() {
            Ok(n) => n,
            Err(_) => return Err(AgentError::Unauthorized),
        },
        None => return Err(AgentError::Unauthorized),
    };

    let request: AwsResolveRequest = match state.validate_access_and_get_data(
        auth_header.token(),
        nonce,
        &body,
    ) {
        Some(r) => r,
        None => return Err(AgentError::Unauthorized),
    };

    let reg_info = state
        .get_registration(auth_header.token())
        .ok_or(AgentError::Unauthorized)?;

    let mut config_loader = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .profile_name(&request.profile_name);

    if let Some(ref region) = request.region {
        if !region.is_empty() {
            config_loader = config_loader.region(aws_config::Region::new(region.clone()));
        }
    }

    let config = config_loader.load().await;

    let credentials_provider = config
        .credentials_provider()
        .ok_or_else(|| {
            AgentError::AwsConfigError(format!(
                "No credentials provider found for profile '{}'", request.profile_name
            ))
        })?;

    let creds = credentials_provider
        .provide_credentials()
        .await
        .map_err(|e| AgentError::AwsConfigError(e.to_string()))?;

    let expiration = creds
        .expiry()
        .map(|t| {
            chrono::DateTime::<chrono::Utc>::from(t)
                .to_rfc3339()
        });

    tracing::info!(
        profile = %request.profile_name,
        "Resolved AWS credentials"
    );

    Ok(EncryptedJson {
        key_b16: reg_info.shared_secret_b16,
        data: AwsCredentialsResponse {
            access_key_id: creds.access_key_id().to_string(),
            secret_access_key: creds.secret_access_key().to_string(),
            session_token: creds.session_token().map(|s| s.to_string()),
            expiration,
        },
    })
}
