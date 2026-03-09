use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use tauri::Config as TauriConfig;

use crate::{
    bundle::VerifiedBundle, cache::CacheManager, storage::StorageManager, vendor::VendorError,
    Manifest,
};

use super::Result;

const VENDOR_SOURCE: &str = "vendor";

#[derive(Debug, Clone, Default)]
pub struct VendorConfig {
    pub bundle_path: PathBuf,
    pub manifest_path: PathBuf,
}

impl VendorConfig {
    pub async fn initialize(
        &self,
        config: TauriConfig,
        cache: Arc<CacheManager>,
        storage: Arc<StorageManager>,
    ) -> Result<()> {
        let content = fs::read(&self.bundle_path).map_err(|e| VendorError::Io(e))?;

        let manifest_str =
            fs::read_to_string(&self.manifest_path).map_err(|e| VendorError::Io(e))?;

        let manifest: Manifest =
            serde_json::from_str(&manifest_str).map_err(|e| VendorError::Json(e))?;

        let max_bundle_size = 100 * 1024 * 1024;
        if content.len() > max_bundle_size {
            return Err(VendorError::InvalidData(format!(
                "Bundle too large: {} bytes (max: {} bytes)",
                content.len(),
                max_bundle_size
            )));
        }

        let name = config
            .product_name
            .unwrap_or("unknown".to_string())
            .to_lowercase();
        let version = manifest
            .version
            .clone()
            .unwrap_or_else(|| config.version.as_deref().unwrap_or("0.0.0").to_string());

        tracing::info!(
            name = %name,
            version = %version,
            size = content.len(),
            "Initializing vendored bundle"
        );

        let verified = VerifiedBundle::trust(content, manifest)?;

        // NOTE: This is temporary, to make sure bundle verifier
        // has required file at the location,
        // won't be necessary after source refactor.
        storage
            .store_bundle(&name, VENDOR_SOURCE, &version, &verified)
            .await?;

        cache.cache_bundle(&name, &verified).await?;

        tracing::info!(
            name = %name,
            "Vendored bundle initialized successfully"
        );
        Ok(())
    }
}
