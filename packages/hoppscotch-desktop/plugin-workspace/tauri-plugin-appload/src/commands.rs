use std::sync::Arc;

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{
    command, AppHandle, LogicalPosition, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

use crate::{
    bundle::BundleLoader,
    cache::CacheManager,
    models::{
        CloseOptions, CloseResponse, DownloadOptions, DownloadResponse, LoadOptions, LoadResponse,
    },
    storage::{StorageError, StorageManager},
    ui, RemoveOptions, RemoveResponse, Result,
};

fn sanitize_window_label(input: &str) -> String {
    input
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect()
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
    let base_label = sanitize_window_label(&options.window.title);
    let current_label = format!("{}-curr", base_label);
    let alternate_label = format!("{}-next", base_label);

    let label = if app.get_webview_window(&current_label).is_some() {
        alternate_label
    } else {
        current_label
    };

    tracing::info!(?options, bundle = %options.bundle_name, window_label = %label, "Loading bundle");

    let url = format!("app://{}/", options.bundle_name.to_lowercase());
    tracing::debug!(%url, "Generated app URL");

    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.parse().unwrap()))
        .initialization_script(crate::KERNEL_JS)
        .title(sanitize_window_label(&options.window.title))
        .inner_size(options.window.width, options.window.height)
        .resizable(options.window.resizable)
        .disable_drag_drop_handler()
        .build()
        .map_err(|e| {
            tracing::error!(?e, ?label, "Failed to create window");
            e
        })?;

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

    let response = LoadResponse {
        success: window.is_visible().unwrap_or(false),
        window_label: label,
    };

    tracing::info!(?response, "Bundle loaded successfully");
    Ok(response)
}

#[command]
pub async fn close<R: Runtime>(app: AppHandle<R>, options: CloseOptions) -> Result<CloseResponse> {
    tracing::info!(?options, "Starting window close process");

    let Some(window) = app.get_webview_window(&options.window_label) else {
        tracing::info!(window_label = %options.window_label, "Window not found or already closed");
        return Ok(CloseResponse { success: true });
    };

    window.close().map_err(|e| {
        tracing::error!(?e, window_label = %options.window_label, "Failed to close window");
        e
    })?;

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

    tracing::debug!("Retrieved StorageManager and CacheManager states");

    storage
        .delete_bundle(&options.bundle_name, &options.server_url)
        .await
        .map_err(|e| {
            tracing::error!(?e, "Failed to delete bundle from storage");
            e
        })?;

    cache.clear_memory_cache().await;

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
