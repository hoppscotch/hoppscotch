use bon::Builder;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;

use crate::cache::DEFAULT_CACHE_SIZE;
use crate::vendor::VendorConfig;

#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub api: ApiConfig,
    #[serde(default)]
    pub cache: CacheConfig,
    #[serde(default)]
    pub storage: StorageConfig,
    #[serde(skip)]
    pub vendor: VendorConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub server_url: String,
    #[serde(with = "humantime_serde")]
    pub timeout: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub max_size: usize,
    #[serde(with = "humantime_serde")]
    pub file_ttl: Duration,
    pub hot_ratio: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub root_dir: PathBuf,
    pub max_bundle_size: usize,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            server_url: "http://localhost:3200".to_string(),
            timeout: Duration::from_secs(30),
        }
    }
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            max_size: DEFAULT_CACHE_SIZE,
            file_ttl: Duration::from_secs(3600),
            hot_ratio: 0.9,
        }
    }
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            root_dir: PathBuf::from("data"),
            max_bundle_size: 50 * 1024 * 1024, // 50MB
        }
    }
}
