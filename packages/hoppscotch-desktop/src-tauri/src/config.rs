use std::{fs, path::PathBuf, sync::Mutex, time::Duration};

use serde::Deserialize;
use tauri_plugin_appload::{ApiConfig, CacheConfig, Config, StorageConfig, VendorConfig};

use crate::{error::HoppError, path};

// Appload plugin configuration, baked into the plugin config at startup by
// `HoppApploadConfig::build()`. `API_TIMEOUT_SECS` is the fallback when the
// store holds no usable `connectionTimeoutMs`, see
// `persisted_connection_timeout()`. The rest stay compile-time only.
const API_SERVER_URL: &str = "http://localhost:3200";
const API_TIMEOUT_SECS: u64 = 30;
const CACHE_MAX_SIZE_MB: usize = 1000;
const CACHE_FILE_TTL_SECS: u64 = 3600;
const CACHE_HOT_RATIO: f32 = 0.9;
const MAX_BUNDLE_SIZE_MB: usize = 50;

// `STORE_FILE_NAME` mirrors `STORE_PATH` in the shell's `kernel/store.ts`,
// and the namespace and key mirror `DESKTOP_SETTINGS_STORE_NAMESPACE` and
// `DESKTOP_SETTINGS_STORE_KEY` in
// `hoppscotch-common/src/platform/desktop-settings.ts`. A rename on either
// side without a matching edit here reads as "no stored value" and silently
// falls back, so the three constants stay next to the read that uses them.
const STORE_FILE_NAME: &str = "hoppscotch-unified.store";
const DESKTOP_SETTINGS_NAMESPACE: &str = "hoppscotch-desktop.v1";
const DESKTOP_SETTINGS_KEY: &str = "desktopSettings";

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
                timeout: persisted_connection_timeout()
                    .unwrap_or_else(|| Duration::from_secs(API_TIMEOUT_SECS)),
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

/// Extracts `connectionTimeoutMs` out of a parsed unified-store document.
///
/// The nesting comes from `TauriStoreManager` in
/// `hoppscotch-kernel/src/store/impl/desktop/v/1.ts`, which keeps every
/// namespace under a single `data` key on the tauri-plugin-store file and
/// wraps each stored value in a `{ schemaVersion, metadata, data }`
/// envelope, so the field is four levels down.
///
/// A zero or absent value returns `None`. Zero would build a client that
/// times out before it can connect, and the Zod schema on the webview side
/// already rejects it, so it only appears in a hand-edited or truncated
/// file. No upper bound is applied, since a large value only costs a long
/// wait the user asked for.
fn connection_timeout_from_store(root: &serde_json::Value) -> Option<Duration> {
    let ms = root
        .get("data")?
        .get(DESKTOP_SETTINGS_NAMESPACE)?
        .get(DESKTOP_SETTINGS_KEY)?
        .get("data")?
        .get("connectionTimeoutMs")?
        .as_u64()?;

    (ms > 0).then(|| Duration::from_millis(ms))
}

/// Reads the persisted connection timeout directly off the store file.
///
/// `build()` is called before `tauri::Builder`, so there is no app handle
/// and `tauri-plugin-store` is not registered yet, which rules out the
/// plugin's own API. The webview's `set_desktop_config` push arrives later
/// still, after appload has already downloaded the bundle it needed the
/// timeout for, so a mailbox read here would see `None` on every launch and
/// the first connection attempt would always use the compile-time default.
///
/// Every failure path returns `None` and leaves the caller on that default,
/// so a fresh install, a missing directory, unreadable bytes, or a changed
/// store layout all degrade to current behavior and startup continues.
fn persisted_connection_timeout() -> Option<Duration> {
    let path = path::store_dir().ok()?.join(STORE_FILE_NAME);
    let contents = fs::read_to_string(&path).ok()?;
    let root = serde_json::from_str::<serde_json::Value>(&contents).ok()?;
    let timeout = connection_timeout_from_store(&root)?;

    tracing::debug!(?timeout, "Applying persisted connection timeout");
    Some(timeout)
}

// The webview persists user settings (timeout, zoom, auto-reconnect, and so
// on) via `tauri-plugin-store`, and pushes them to Rust through
// `set_desktop_config` at init and on every change. A pushed value reaches
// Rust without a restart, which is what a live consumer needs and what
// reading the store file cannot give.
//
// The IPC plumbing is wired end-to-end but no Rust code reads
// `DESKTOP_CONFIG` yet. The appload connection timeout deliberately does
// not, because appload's config is built before any webview exists to push,
// so `persisted_connection_timeout()` reads the store file for that one
// value and accepts a restart to pick up a change. Anything needing the
// change to apply immediately is what the mailbox is still here for.
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

    // Mirrors a real `hoppscotch-unified.store` document, including the
    // sibling namespace and the sibling keys the shell writes. A minimal
    // stub would pass even with the lookup path wrong by one level, so
    // the full nesting is what makes the assertion meaningful.
    fn store_document(settings: serde_json::Value) -> serde_json::Value {
        serde_json::json!({
            "data": {
                "migration.v1": { "schema_version": { "data": 2 } },
                "hoppscotch-desktop.v1": {
                    "connectionState": { "data": { "status": "idle" } },
                    "schema_version": { "data": 2 },
                    "desktopSettings": {
                        "schemaVersion": 1,
                        "metadata": { "namespace": "hoppscotch-desktop.v1" },
                        "data": settings
                    }
                }
            }
        })
    }

    #[test]
    fn reads_connection_timeout_from_store_document() {
        let doc = store_document(serde_json::json!({
            "connectionTimeoutMs": 90_000,
            "zoomLevel": 1.0,
            "keyboardLayoutStrategy": "hybrid"
        }));
        assert_eq!(
            connection_timeout_from_store(&doc),
            Some(Duration::from_millis(90_000))
        );
    }

    #[test]
    fn store_without_desktop_settings_yields_no_override() {
        let empty = serde_json::json!({});
        assert_eq!(connection_timeout_from_store(&empty), None);

        let other_namespace = serde_json::json!({ "data": { "migration.v1": {} } });
        assert_eq!(connection_timeout_from_store(&other_namespace), None);
    }

    #[test]
    fn unusable_timeout_values_yield_no_override() {
        // Zero would build a client that expires before it can connect.
        let zero = store_document(serde_json::json!({ "connectionTimeoutMs": 0 }));
        assert_eq!(connection_timeout_from_store(&zero), None);

        let missing = store_document(serde_json::json!({ "zoomLevel": 1.0 }));
        assert_eq!(connection_timeout_from_store(&missing), None);

        let wrong_type = store_document(serde_json::json!({ "connectionTimeoutMs": "90s" }));
        assert_eq!(connection_timeout_from_store(&wrong_type), None);

        let negative = store_document(serde_json::json!({ "connectionTimeoutMs": -1 }));
        assert_eq!(connection_timeout_from_store(&negative), None);
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
