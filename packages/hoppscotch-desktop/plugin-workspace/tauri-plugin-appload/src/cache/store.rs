use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;

use dashmap::DashMap;
use lru::LruCache;
use tauri::Config;
use tokio::sync::Mutex;

use super::{CacheError, Result};

pub struct FileStore {
    hot_cache: Arc<Mutex<LruCache<String, CacheEntry>>>,
    disk_cache: Arc<DashMap<String, PathBuf>>,
    cache_dir: PathBuf,
    max_memory: usize,
    config: Config,
}

struct CacheEntry {
    content: Vec<u8>,
    last_accessed: Instant,
    size: usize,
}

impl FileStore {
    pub fn new(cache_dir: PathBuf, max_memory: usize, config: Config) -> Self {
        tracing::info!(
            cache_dir = ?cache_dir,
            max_memory,
            "Initializing FileStore with cache directory and memory limit."
        );
        Self {
            hot_cache: Arc::new(Mutex::new(LruCache::new(
                std::num::NonZeroUsize::new(1000).unwrap(),
            ))),
            disk_cache: Arc::new(DashMap::new()),
            cache_dir,
            max_memory,
            config,
        }
    }

    pub async fn store(&self, key: &str, content: Vec<u8>) -> Result<()> {
        let size = content.len();
        tracing::info!(key, size, "Storing file in cache.");

        let mut cache = self.hot_cache.lock().await;
        let current_size = self.current_size(&cache);

        if current_size + size <= self.max_memory {
            tracing::debug!(key, size, "File fits in memory; adding to hot cache.");
            cache.put(
                key.to_string(),
                CacheEntry {
                    content,
                    last_accessed: Instant::now(),
                    size,
                },
            );
            return Ok(());
        }

        if size > self.max_memory {
            tracing::warn!(
                key,
                size,
                "File size exceeds maximum memory. Writing directly to disk."
            );
            let path = self.cache_dir.join(key);
            tokio::fs::write(&path, &content).await.map_err(|e| {
                tracing::error!(key, error = %e, "Failed to write file to disk.");
                e
            })?;
            self.disk_cache.insert(key.to_string(), path);
            return Ok(());
        }

        tracing::debug!(
            key,
            size,
            current_size,
            "Hot cache full; evicting files to make room."
        );
        while cache.len() > 0 && self.current_size(&cache) + size > self.max_memory {
            if let Some((evicted_key, entry)) = cache.pop_lru() {
                let path = self.cache_dir.join(&evicted_key);
                tracing::debug!(evicted_key, "Evicting file to disk.");
                std::fs::write(&path, &entry.content).map_err(|e| {
                    tracing::error!(
                        evicted_key,
                        error = %e,
                        "Failed to write evicted file to disk."
                    );
                    e
                })?;
                self.disk_cache.insert(evicted_key, path);
            }
        }

        tracing::debug!(key, "Adding file to hot cache after eviction.");
        cache.put(
            key.to_string(),
            CacheEntry {
                content,
                last_accessed: Instant::now(),
                size,
            },
        );
        Ok(())
    }

    pub async fn get(&self, key: &str) -> Result<Vec<u8>> {
        tracing::info!(key, "Retrieving file from cache.");
        tracing::debug!(
            key,
            thread_id = ?std::thread::current().id(),
            hot_cache_len = self.hot_cache.lock().await.len(),
            disk_cache_len = self.disk_cache.len(),
            "Cache access attempt details"
        );

        let mut guard = self.hot_cache.lock().await;
        if let Some(entry) = guard.get(key) {
            tracing::debug!(key, "File found in hot cache.");
            return Ok(entry.content.clone());
        }
        drop(guard);

        tracing::debug!(key, "File not found in hot cache. Checking disk cache.");
        if let Some(path) = self.disk_cache.get(key) {
            tracing::debug!(key, path = ?path, "File found in disk cache. Reading from disk.");
            let content = tokio::fs::read(path.value()).await.map_err(|e| {
                tracing::error!(key, error = %e, "Failed to read file from disk.");
                e
            })?;
            self.store(key, content.clone()).await?;
            return Ok(content);
        }

        tracing::warn!(key, "File not found in cache.");
        Err(CacheError::NotFound(key.to_string()))
    }

    pub async fn clear_except_prefix(&self, prefix: &str) {
        let mut cache = self.hot_cache.lock().await;

        let keys_to_keep: Vec<_> = cache
            .iter()
            .filter(|(key, _)| key.starts_with(prefix))
            .map(|(key, _)| key.clone())
            .collect();

        let mut new_cache = LruCache::new(std::num::NonZeroUsize::new(1000).unwrap());
        for key in keys_to_keep {
            if let Some(entry) = cache.pop(&key) {
                new_cache.put(key, entry);
            }
        }

        *cache = new_cache;
    }

    pub async fn clear(&self) {
        tracing::info!("Clearing in-memory cache");
        let config = self.config.clone();
        let name = config
            .product_name
            .unwrap_or("unknown".to_string())
            .to_lowercase();
        self.clear_except_prefix(&name).await;
        tracing::info!("In-memory cache cleared successfully");
    }

    fn current_size(&self, cache: &LruCache<String, CacheEntry>) -> usize {
        let size = cache.iter().map(|(_, entry)| entry.size).sum();
        tracing::debug!(current_size = size, "Calculating current hot cache size.");
        size
    }
}
