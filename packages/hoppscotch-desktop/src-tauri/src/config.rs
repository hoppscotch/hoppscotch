use std::{fs, path::PathBuf, sync::Mutex, time::Duration};

use serde::Deserialize;
use tauri_plugin_appload::{ApiConfig, CacheConfig, Config, StorageConfig, VendorConfig};

use crate::{error::HoppError, path};

// Appload plugin configuration. These constants are baked into the plugin
// config at startup via `HoppApploadConfig::build()`, before the webview
// exists, so they cannot be overridden by runtime user settings. A future
// user-facing connection timeout override will need a separate mechanism,
// either a startup-time store file read or a deferred appload init.
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
            .log_dir(
                path::logs_dir().unwrap_or_else(|_| std::env::temp_dir()),
            )
            .build()
    }
}

// Webview-pushed runtime settings bridge.
//
// The webview persists user settings (timeout, zoom, auto-reconnect, and so
// on) via `tauri-plugin-store`. The Tauri shell needs live access to some
// of those values, for example `connectionTimeoutMs` for the appload HTTP
// client. Rather than having Rust read the store file directly, which would
// couple this code to the plugin's on-disk format, the webview pushes the
// current settings to Rust via `set_desktop_config` at init and on change.
//
// The IPC plumbing is wired end-to-end but no Rust code reads
// `DESKTOP_CONFIG` yet. Consumers such as the appload connection timeout
// are future scope.
//
// The struct deliberately only deserializes fields Rust actually consumes.
// TS sends the full `DESKTOP_SETTINGS_SCHEMA` payload and serde drops the
// rest. Adding a new Rust consumer means adding a field here, not changing
// the IPC contract.

/// Subset of the webview-side `DesktopSettings` that Rust services consume.
///
/// Field names are snake_case with `rename_all = "camelCase"` so they line
/// up with what the TS store produces from `DESKTOP_SETTINGS_SCHEMA`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConfig {
    /// Timeout (ms) for outbound HTTP requests in the appload client and
    /// related connection paths. Mirrors `API_TIMEOUT_SECS` when the value
    /// is 30_000.
    pub connection_timeout_ms: u64,
}

/// Live copy of the most recent settings pushed from the webview.
///
/// `None` means the webview has not called `set_desktop_config` yet, which
/// is the case during the early Tauri startup path before the window loads
/// and for the whole of the pre-webview `PortableHome` and `StandardHome`
/// flow. Consumers must treat `None` as "no override, use the compile-time
/// default".
static DESKTOP_CONFIG: Mutex<Option<DesktopConfig>> = Mutex::new(None);

/// Returns a clone of the most recent settings pushed from the webview, or
/// `None` if nothing has been pushed yet.
///
/// Cloning keeps the lock scope short, which is cheap because
/// `DesktopConfig` is a small POD struct.
#[allow(dead_code)] // no Rust consumers yet, see module doc above.
pub fn current_desktop_config() -> Option<DesktopConfig> {
    DESKTOP_CONFIG
        .lock()
        .ok()
        .and_then(|guard| guard.clone())
}

/// Tauri command invoked by the webview on init and whenever settings
/// change. Overwrites any previously-pushed config and is idempotent on
/// identical input.
#[tauri::command]
pub fn set_desktop_config(config: DesktopConfig) -> Result<(), String> {
    tracing::debug!(?config, "Received desktop config from webview");
    let mut guard = DESKTOP_CONFIG
        .lock()
        .map_err(|e| format!("DESKTOP_CONFIG mutex poisoned: {}", e))?;
    *guard = Some(config);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constants() {
        // NOTE: These are rather pointless tests, but are here just in case
        // there are rebase/merge conflicts that rewrites the values
        // (since there's been quite a lot of experimentation on that front)
        // so this created on a new branch shall remain consistent.
        assert_eq!(API_SERVER_URL, "http://localhost:3200");
        assert_eq!(API_TIMEOUT_SECS, 30);
        assert_eq!(CACHE_MAX_SIZE_MB, 1000);
        assert_eq!(CACHE_FILE_TTL_SECS, 3600);
        assert_eq!(CACHE_HOT_RATIO, 0.9);
        assert_eq!(MAX_BUNDLE_SIZE_MB, 50);
    }

    #[test]
    fn test_hopp_appload_config_new() {
        let config = HoppApploadConfig::new();
        assert!(config.is_ok());

        let config = config.unwrap();
        assert!(config
            .bundle_path
            .to_string_lossy()
            .contains("hopp_bundle.zip"));
        assert!(config
            .manifest_path
            .to_string_lossy()
            .contains("hopp_manifest.json"));
        assert!(!config.config_dir.as_os_str().is_empty());
    }

    #[test]
    fn test_config_paths() {
        let config = HoppApploadConfig::new().unwrap();

        assert_eq!(
            config.bundle_path.file_name().unwrap().to_str().unwrap(),
            "hopp_bundle.zip"
        );

        assert_eq!(
            config.manifest_path.file_name().unwrap().to_str().unwrap(),
            "hopp_manifest.json"
        );

        assert!(!config.config_dir.as_os_str().is_empty());
    }

    // The roundtrip and overwrite assertions stay in one test because
    // `DESKTOP_CONFIG` is process-wide shared state and cargo runs tests
    // in parallel by default. Splitting them into two `#[test]` functions
    // would race for the global mutex and produce flaky assertions
    // depending on schedule. The other tests in this module exercise
    // `DesktopConfig` deserialization in isolation and never touch
    // `DESKTOP_CONFIG`, so they are safe to run alongside this one.
    #[test]
    fn set_desktop_config_roundtrip_and_overwrite() {
        let result = set_desktop_config(DesktopConfig {
            connection_timeout_ms: 45_000,
        });
        assert!(result.is_ok());
        assert_eq!(
            current_desktop_config().unwrap().connection_timeout_ms,
            45_000
        );

        set_desktop_config(DesktopConfig {
            connection_timeout_ms: 90_000,
        })
        .unwrap();
        assert_eq!(
            current_desktop_config().unwrap().connection_timeout_ms,
            90_000
        );
    }

    #[test]
    fn desktop_config_deserializes_from_camel_case() {
        let json = r#"{"connectionTimeoutMs": 60000}"#;
        let cfg: DesktopConfig = serde_json::from_str(json).unwrap();
        assert_eq!(cfg.connection_timeout_ms, 60_000);
    }

    #[test]
    fn desktop_config_deserialize_ignores_extra_fields() {
        // TS pushes the full `DESKTOP_SETTINGS_SCHEMA` so extras must drop.
        let json = r#"{
            "connectionTimeoutMs": 30000,
            "disableUpdateNotifications": true,
            "zoomLevel": 1.25
        }"#;
        let cfg: DesktopConfig = serde_json::from_str(json).unwrap();
        assert_eq!(cfg.connection_timeout_ms, 30_000);
    }
}
