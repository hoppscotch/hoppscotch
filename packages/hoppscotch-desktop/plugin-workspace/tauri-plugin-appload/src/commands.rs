use std::sync::Arc;

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{
    command, AppHandle, LogicalPosition, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

use crate::{
    bundle::BundleLoader,
    cache::CacheManager,
    mapping::HostMapper,
    models::{
        CloseOptions, CloseResponse, DownloadOptions, DownloadResponse, LoadOptions, LoadResponse,
    },
    storage::{StorageError, StorageManager},
    ui, RemoveOptions, RemoveResponse, Result,
};

/// Writes a line to appload.diag.log for debugging window lifecycle events.
/// This runs at the Rust level so it captures events even when JS logging
/// fails (e.g. webview destroyed before JS can write). Best-effort: silently
/// ignores any IO errors.
///
/// The log directory comes from `Config::log_dir`, set by the host app during
/// plugin initialization. If no log_dir was configured, this is a no-op.
fn diag_log(msg: &str) {
    let Some(dir) = crate::DIAG_LOG_DIR.get() else {
        return;
    };
    let _ = std::fs::create_dir_all(dir);
    let path = dir.join("appload.diag.log");
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .and_then(|mut f| {
            use std::io::Write;
            writeln!(f, "[{}] [RUST] {}", chrono::Utc::now().to_rfc3339(), msg)
        });
}

/// Maximum length for window labels/hosts
const MAX_HOST_LENGTH: usize = 255;

fn sanitize_window_label(input: &str) -> Result<String> {
    if input.is_empty() {
        return Err(crate::Error::Config("Host cannot be empty".into()));
    }
    if input.len() > MAX_HOST_LENGTH {
        return Err(crate::Error::Config(format!(
            "Host exceeds maximum length of {} characters",
            MAX_HOST_LENGTH
        )));
    }

    Ok(input
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect())
}

#[command]
pub async fn download<R: Runtime>(
    app: AppHandle<R>,
    options: DownloadOptions,
) -> Result<DownloadResponse> {
    tracing::info!(?options, "Starting download process");
    let bundle_loader = app.state::<Arc<BundleLoader>>();
    tracing::debug!("Retrieved BundleLoader state");

    tracing::info!(url = %options.server_url, "Attempting to load bundle");
    bundle_loader
        .load_bundle(options.server_url.as_str())
        .await
        .map_err(|e| {
            tracing::error!(?e, url = %options.server_url, "Failed to load bundle");
            e
        })?;

    let storage = app.state::<Arc<crate::storage::StorageManager>>();
    tracing::debug!("Retrieved StorageManager state");

    tracing::info!(url = %options.server_url, "Fetching bundle entry from storage");
    let entry = storage
        .get_bundle_entry(options.server_url.as_str())
        .await
        .map_err(|e| {
            tracing::error!(?e, url = %options.server_url, "Failed to fetch bundle entry");
            e
        })?
        .ok_or_else(|| {
            tracing::error!(url = %options.server_url, "Bundle not found after download");
            crate::Error::Config("Bundle not found after download".into())
        })?;

    let response = DownloadResponse {
        success: true,
        bundle_name: entry.bundle_name,
        server_url: options.server_url,
        version: entry.version,
    };

    tracing::info!(?response, "Download completed successfully");
    Ok(response)
}

#[command]
pub async fn load<R: Runtime>(app: AppHandle<R>, options: LoadOptions) -> Result<LoadResponse> {
    let base_label = sanitize_window_label(&options.window.title)?;
    let current_label = format!("{}-curr", base_label);
    let alternate_label = format!("{}-next", base_label);

    let has_curr = app.get_webview_window(&current_label).is_some();
    let has_next = app.get_webview_window(&alternate_label).is_some();
    let label = if has_curr {
        alternate_label.clone()
    } else {
        current_label.clone()
    };

    // All webviews use the bundle name as the URL host so they share the same
    // origin (app://{bundle_name}/). This is critical because Tauri v2's IPC
    // validates the webview origin at runtime and rejects origins it doesn't
    // recognize. Using different hosts per org (e.g. app://test_org_hoppscotch_io)
    // would break all IPC communication in the org webview.
    //
    // For cloud-for-orgs, the org host is passed as a query parameter instead.
    // The JS side reads window.location.search to get the org context, and the
    // kernel store uses the query param to maintain per-org file isolation.
    let sanitized_bundle = sanitize_window_label(&options.bundle_name)?;

    let url = match &options.host {
        Some(host) => {
            // pass the original host value as-is in the query param so the JS
            // side can extract the org domain without reversing sanitization.
            // URL query values don't need the same restrictions as hostnames
            format!(
                "app://{}/?org={}",
                sanitized_bundle.to_lowercase(),
                host.to_lowercase()
            )
        }
        None => format!("app://{}/", sanitized_bundle.to_lowercase()),
    };

    // list all existing webview windows so the diag log shows the full picture
    let existing_windows: Vec<String> = app
        .webview_windows()
        .keys()
        .cloned()
        .collect();

    diag_log(&format!(
        "LOAD called: bundle={}, host={:?}, title={}, url={}, label={}, has_curr={}, has_next={}, existing_windows={:?}",
        options.bundle_name,
        options.host,
        options.window.title,
        url,
        label,
        has_curr,
        has_next,
        existing_windows
    ));

    tracing::info!(
        ?options,
        bundle = %options.bundle_name,
        %url,
        window_label = %label,
        "Loading bundle"
    );
    tracing::debug!(%url, "Generated app URL");

    let host_mapper = app.state::<Arc<HostMapper>>();
    host_mapper.register(
        &sanitized_bundle.to_lowercase(),
        &options.bundle_name.to_lowercase(),
    );
    tracing::debug!(
        host = %sanitized_bundle.to_lowercase(),
        bundle = %options.bundle_name.to_lowercase(),
        "Registered host mapping"
    );

    let sanitized_title = sanitize_window_label(&options.window.title)?;

    // Build the webview with the kernel init script. Org context is carried
    // via the ?org= query param in the URL (set above) and preserved across
    // Vue Router navigations by a beforeEach guard in modules/router.ts.
    let builder =
        WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.parse().unwrap()))
            .initialization_script(crate::KERNEL_JS)
            .title(sanitized_title)
            .inner_size(options.window.width, options.window.height)
            .resizable(options.window.resizable)
            .disable_drag_drop_handler();

    let window = match builder.build()
        {
            Ok(window) => window,
            Err(e) => {
                tracing::error!(
                    ?e,
                    ?label,
                    "Failed to create window, cleaning up host mapping"
                );
                host_mapper.unregister(&sanitized_bundle.to_lowercase());
                return Err(e.into());
            }
        };

    #[cfg(target_os = "macos")]
    {
        let window_clone = window.clone();
        window.run_on_main_thread(move || {
            ui::macos::posit::setup_window(window_clone);
        })?;
    }

    #[cfg(target_os = "windows")]
    {
        let window_clone = window.clone();
        window.run_on_main_thread(move || {
            ui::windows::posit::setup_window(window_clone);
        })?;
    }

    let is_visible = window.is_visible().unwrap_or(false);
    let response = LoadResponse {
        success: is_visible,
        window_label: label.clone(),
    };

    diag_log(&format!(
        "LOAD complete: label={}, visible={}, success={}",
        label, is_visible, response.success
    ));

    tracing::info!(?response, "Bundle loaded successfully");
    Ok(response)
}

#[command]
pub async fn close<R: Runtime>(app: AppHandle<R>, options: CloseOptions) -> Result<CloseResponse> {
    tracing::info!(?options, "Starting window close process");

    let existing_windows: Vec<String> = app
        .webview_windows()
        .keys()
        .cloned()
        .collect();

    diag_log(&format!(
        "CLOSE called: window_label={}, existing_windows={:?}",
        options.window_label,
        existing_windows
    ));

    let Some(window) = app.get_webview_window(&options.window_label) else {
        diag_log(&format!(
            "CLOSE: window {} not found or already closed",
            options.window_label
        ));
        tracing::info!(window_label = %options.window_label, "Window not found or already closed");
        return Ok(CloseResponse { success: true });
    };

    window.close().map_err(|e| {
        diag_log(&format!(
            "CLOSE: failed to close window {}: {:?}",
            options.window_label, e
        ));
        tracing::error!(?e, window_label = %options.window_label, "Failed to close window");
        e
    })?;

    let remaining_windows: Vec<String> = app
        .webview_windows()
        .keys()
        .cloned()
        .collect();

    diag_log(&format!(
        "CLOSE complete: closed={}, remaining_windows={:?}",
        options.window_label,
        remaining_windows
    ));

    let response = CloseResponse { success: true };

    tracing::info!(?response, "Window close process completed");
    Ok(response)
}

#[command]
pub async fn remove<R: Runtime>(
    app: AppHandle<R>,
    options: RemoveOptions,
) -> Result<RemoveResponse> {
    tracing::info!(?options, "Starting instance removal process");
    let storage = app.state::<Arc<StorageManager>>();
    let cache = app.state::<Arc<CacheManager>>();
    let host_mapper = app.state::<Arc<HostMapper>>();

    tracing::debug!("Retrieved StorageManager, CacheManager, and HostMapper states");

    storage
        .delete_bundle(&options.bundle_name, &options.server_url)
        .await
        .map_err(|e| {
            tracing::error!(?e, "Failed to delete bundle from storage");
            e
        })?;

    cache.clear_memory_cache().await;

    // Clean up mappings that pointed to this bundle, otherwise they'd resolve to files
    // that no longer exist.
    host_mapper.remove_mappings_for_bundle(&options.bundle_name.to_lowercase());

    let response = RemoveResponse {
        success: true,
        bundle_name: options.bundle_name,
    };

    tracing::info!(?response, "Instance removed successfully");
    Ok(response)
}

#[command]
pub async fn clear<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    tracing::info!("Starting bundle cleanup process");
    let storage = app.state::<Arc<StorageManager>>();
    let host_mapper = app.state::<Arc<HostMapper>>();

    host_mapper.clear();
    tracing::debug!("Cleared host mappings");

    let layout = storage.layout();

    if layout.bundles_dir().exists() {
        tracing::debug!("Clearing bundles directory");
        tokio::fs::remove_dir_all(layout.bundles_dir())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to clear bundles directory");
                crate::Error::Storage(StorageError::Io(e))
            })?;
        tokio::fs::create_dir(layout.bundles_dir())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to recreate bundles directory");
                crate::Error::Storage(StorageError::Io(e))
            })?;
    }

    if layout.cache_dir().exists() {
        tracing::debug!("Clearing cache directory");
        tokio::fs::remove_dir_all(layout.cache_dir())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to clear cache directory");
                crate::Error::Storage(StorageError::Io(e))
            })?;
        tokio::fs::create_dir(layout.cache_dir())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to recreate cache directory");
                crate::Error::Storage(StorageError::Io(e))
            })?;
    }

    if layout.key_dir().exists() {
        tracing::debug!("Clearing key directory");
        tokio::fs::remove_dir_all(layout.key_dir())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to clear key directory");
                crate::Error::Storage(StorageError::Io(e))
            })?;
        tokio::fs::create_dir(layout.key_dir()).await.map_err(|e| {
            tracing::error!(error = %e, "Failed to recreate key directory");
            crate::Error::Storage(StorageError::Io(e))
        })?;
    }

    if layout.temp_dir().exists() {
        tracing::debug!("Clearing temp directory");
        tokio::fs::remove_dir_all(layout.temp_dir())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to clear temp directory");
                crate::Error::Storage(StorageError::Io(e))
            })?;
        tokio::fs::create_dir(layout.temp_dir())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to recreate temp directory");
                crate::Error::Storage(StorageError::Io(e))
            })?;
    }

    if layout.registry_path().exists() {
        tracing::debug!("Removing registry.json");
        tokio::fs::remove_file(layout.registry_path())
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Failed to remove registry.json");
                crate::Error::Storage(StorageError::Io(e))
            })?;
    }

    tracing::info!("Bundle cleanup completed successfully");
    Ok(())
}
