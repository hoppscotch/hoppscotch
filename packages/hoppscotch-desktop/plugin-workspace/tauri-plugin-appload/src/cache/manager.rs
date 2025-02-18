use std::path::PathBuf;
use std::sync::Arc;

use rayon::prelude::*;
use tauri::Config;

use super::{CacheError, CachePolicy, FileStore, Result};
use crate::bundle::VerifiedBundle;

const BATCH_SIZE: usize = 10;

pub struct CacheManager {
    store: Arc<FileStore>,
    policy: CachePolicy,
}

impl CacheManager {
    pub fn new(cache_dir: PathBuf, policy: CachePolicy, config: Config) -> Self {
        tracing::info!(
            ?cache_dir,
            max_size = policy.max_size,
            "Initializing CacheManager"
        );

        let store = Arc::new(FileStore::new(cache_dir, policy.max_size, config));
        Self { store, policy }
    }

    pub async fn get_file(&self, bundle_name: &str, file_path: &str) -> Result<Vec<u8>> {
        let cache_key = format!("{}:{}", bundle_name, file_path);
        tracing::info!(%bundle_name, %file_path, %cache_key, "Retrieving file");

        tracing::debug!(
            %bundle_name,
            %file_path,
            %cache_key,
            thread_id = ?std::thread::current().id(),
            "Cache lookup attempt"
        );

        self.store.get(&cache_key).await
    }

    pub async fn cache_bundle(&self, name: &str, verified: &VerifiedBundle) -> Result<()> {
        tracing::info!(%name, "Starting bundle caching process");

        if verified.total_size > self.policy.max_size {
            tracing::error!(%name, total_size = verified.total_size, max_size = self.policy.max_size, "Cache size limit exceeded");
            return Err(CacheError::CacheFull);
        }

        tracing::info!(%name, "Clearing memory cache before caching bundle");
        self.clear_memory_cache().await;

        let store = self.store.clone();

        verified
            .iter_files()
            .collect::<Vec<_>>()
            .par_chunks(BATCH_SIZE)
            .try_for_each(|batch| {
                batch.iter().try_for_each(|file| {
                    let cache_key = format!("{}:{}", name, file.path);
                    futures::executor::block_on(store.store(&cache_key, file.content.clone()))
                        .map_err(|e| {
                            tracing::error!(%name, path = %file.path, %e, "Cache storage failed");
                            e
                        })
                })
            })?;

        tracing::info!(%name, "Bundle caching completed successfully");
        Ok(())
    }

    pub async fn clear_memory_cache(&self) {
        tracing::info!("Forwarding clear cache request to FileStore");
        self.store.clear().await;
    }
}
