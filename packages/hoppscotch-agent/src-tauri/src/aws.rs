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
use aws_types::os_shim_internal::{Env, Fs};

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

    let profiles = list_profile_names(&Fs::real(), &Env::real()).await;

    tracing::info!(count = profiles.len(), "Listed AWS profiles");

    Ok(EncryptedJson {
        key_b16: reg_info.shared_secret_b16,
        data: AwsProfilesResponse { profiles },
    })
}

/// Enumerate AWS profile names using the same configuration loader the SDK uses
/// to resolve credentials, so listing and resolving agree on what a profile is
/// (and on its exact casing). Honors `AWS_CONFIG_FILE` /
/// `AWS_SHARED_CREDENTIALS_FILE` and skips non-profile sections such as
/// `sso-session`. Returns an empty list if the profile files can't be loaded.
async fn list_profile_names(fs: &Fs, env: &Env) -> Vec<String> {
    // `Default::default()` infers the (deprecated-alias) profile-files type from
    // `load`'s signature without naming it, picking the standard ~/.aws files.
    match aws_config::profile::load(fs, env, &Default::default(), None).await {
        Ok(profiles) => {
            let mut names: Vec<String> =
                profiles.profiles().map(str::to_owned).collect();
            names.sort();
            names.dedup();
            names
        }
        Err(error) => {
            tracing::warn!(?error, "Failed to load AWS profiles");
            Vec::new()
        }
    }
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

    let (request, reg_info): (AwsResolveRequest, _) = match state.validate_access_and_get_data(
        auth_header.token(),
        nonce,
        &body,
    ) {
        Some(r) => r,
        None => return Err(AgentError::Unauthorized),
    };

    if request.profile_name.trim().is_empty() {
        return Err(AgentError::BadRequest("profile_name must not be empty".into()));
    }

    let profile_name = request.profile_name.trim().to_owned();

    let mut config_loader = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .profile_name(&profile_name);

    if let Some(ref region) = request.region {
        if !region.is_empty() {
            config_loader = config_loader.region(aws_config::Region::new(region.clone()));
        }
    }

    let config = config_loader.load().await;

    // Capture the region the SDK resolved for this profile (from ~/.aws/config
    // or the request override) so the caller can sign with the profile's own
    // region when the user left the region field blank.
    let resolved_region = config.region().map(|r| r.as_ref().to_string());

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
            region: resolved_region,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::list_profile_names;
    use aws_types::os_shim_internal::{Env, Fs};

    #[tokio::test]
    async fn lists_profiles_from_config_and_credentials_preserving_case() {
        // Hermetic: fake filesystem + env so no real ~/.aws files are read.
        let fs = Fs::from_slice(&[
            (
                "/fake/config",
                "[profile MyProd]\nregion = eu-west-1\n\n[default]\nregion = us-east-1\n\n[sso-session corp]\nsso_region = us-east-1\n",
            ),
            (
                "/fake/credentials",
                "[Work]\naws_access_key_id = AKIA\n",
            ),
        ]);
        let env = Env::from_slice(&[
            ("AWS_CONFIG_FILE", "/fake/config"),
            ("AWS_SHARED_CREDENTIALS_FILE", "/fake/credentials"),
        ]);

        let names = list_profile_names(&fs, &env).await;

        // Mixed-case names are preserved (case-sensitive AWS lookups).
        assert!(names.contains(&"MyProd".to_string()));
        assert!(names.contains(&"Work".to_string()));
        assert!(names.contains(&"default".to_string()));
        // Non-profile sections (e.g. sso-session) are not listed as profiles.
        assert!(!names.contains(&"corp".to_string()));
    }

    #[tokio::test]
    async fn missing_files_yield_an_empty_list() {
        let fs = Fs::from_slice(&[]);
        let env = Env::from_slice(&[
            ("AWS_CONFIG_FILE", "/does/not/exist"),
            ("AWS_SHARED_CREDENTIALS_FILE", "/also/missing"),
        ]);

        assert!(list_profile_names(&fs, &env).await.is_empty());
    }
}
