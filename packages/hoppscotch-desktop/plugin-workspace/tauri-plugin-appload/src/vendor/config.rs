use std::sync::Arc;

use tauri::Config;

use crate::{
    bundle::VerifiedBundle, cache::CacheManager, storage::StorageManager, vendor::VendorError,
    Manifest,
};

use super::Result;

const VENDOR_SOURCE: &str = "vendor";

#[derive(Debug, Clone)]
pub struct VendorConfig {
    pub(super) bundle: Option<(Vec<u8>, Manifest)>,
}

impl VendorConfig {
    pub(crate) async fn initialize(
        self,
        config: Config,
        cache: Arc<CacheManager>,
        storage: Arc<StorageManager>,
    ) -> Result<()> {
        let Some((content, manifest)) = self.bundle else {
            tracing::info!("No vendored bundle provided, skipping initialization");
            return Ok(());
        };

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
