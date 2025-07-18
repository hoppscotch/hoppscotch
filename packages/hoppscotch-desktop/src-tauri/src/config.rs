use std::{fs, path::PathBuf, time::Duration};

use tauri_plugin_appload::{ApiConfig, CacheConfig, Config, StorageConfig, VendorConfig};

use crate::{error::HoppError, path};

const API_SERVER_URL: &str = "http://localhost:3200";
const API_TIMEOUT_SECS: u64 = 30;
const CACHE_MAX_SIZE_MB: usize = 1000;
const CACHE_FILE_TTL_SECS: u64 = 3600;
const CACHE_HOT_RATIO: f32 = 0.9;
const MAX_BUNDLE_SIZE_MB: usize = 50;

pub struct HoppApploadConfig {
    bundle_path: PathBuf,
    manifest_path: PathBuf,
    config_dir: PathBuf,
}

impl HoppApploadConfig {
    pub fn new() -> Result<Self, HoppError> {
        let config_dir = path::config_dir().unwrap_or_else(|e| {
            tracing::error!(error = %e, "Failed to create config directory, using temp dir");
            std::env::temp_dir().join(path::APP_ID)
        });

        let bundle_path = path::bundle_path();
        let manifest_path = path::manifest_path();

        Ok(Self {
            bundle_path,
            manifest_path,
            config_dir,
        })
    }

    pub fn write_vendored(&self) -> Result<(), HoppError> {
        fs::write(&self.bundle_path, include_bytes!("../../bundle.zip"))?;
        fs::write(&self.manifest_path, include_bytes!("../../manifest.json"))?;
        Ok(())
    }

    pub fn build(&self) -> Config {
        Config::builder()
            .api(ApiConfig {
                server_url: API_SERVER_URL.to_string(),
                timeout: Duration::from_secs(API_TIMEOUT_SECS),
            })
            .cache(CacheConfig {
                max_size: CACHE_MAX_SIZE_MB * 1024 * 1024,
                file_ttl: Duration::from_secs(CACHE_FILE_TTL_SECS),
                hot_ratio: CACHE_HOT_RATIO,
            })
            .storage(StorageConfig {
                root_dir: self.config_dir.clone(),
                max_bundle_size: MAX_BUNDLE_SIZE_MB * 1024 * 1024,
            })
            .vendor(VendorConfig {
                bundle_path: self.bundle_path.clone(),
                manifest_path: self.manifest_path.clone(),
            })
            .build()
    }
}
