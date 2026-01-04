use crate::{dialog, util};
use native_dialog::MessageType;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum UpdateEvent {
    CheckStarted,
    CheckCompleted {
        info: UpdateInfo,
    },
    CheckFailed {
        error: String,
    },
    DownloadStarted {
        #[serde(rename = "totalBytes")]
        total_bytes: Option<u64>,
    },
    DownloadProgress {
        progress: DownloadProgress,
    },
    DownloadCompleted,
    InstallStarted,
    InstallCompleted,
    RestartRequired,
    UpdateCancelled,
    Error {
        message: String,
    },
}

// Global state for tracking update progress
// TODO: See if it's possible to let Tauri handle this state management
static UPDATE_STATE: std::sync::LazyLock<Arc<Mutex<Option<Update>>>> =
    std::sync::LazyLock::new(|| Arc::new(Mutex::new(None)));

static DOWNLOAD_STATE: std::sync::LazyLock<Arc<Mutex<DownloadProgress>>> =
    std::sync::LazyLock::new(|| {
        Arc::new(Mutex::new(DownloadProgress {
            downloaded: 0,
            total: None,
            percentage: 0.0,
        }))
    });

/// Check for updates and returns basic information
/// For portable mode: Shows native dialog if update found
/// For standard mode: Just returns information, UI handles the rest
#[tauri::command]
pub async fn check_for_updates(
    app: AppHandle,
    show_native_dialog: bool,
) -> Result<UpdateInfo, String> {
    tracing::info!(portable_dialog = show_native_dialog, "Checking for updates");

    let _ = app.emit("updater-event", UpdateEvent::CheckStarted);

    let updater = app.updater().map_err(|e| {
        let error_msg = format!("Failed to initialize updater: {}", e);
        tracing::error!("{}", error_msg);
        let _ = app.emit(
            "updater-event",
            UpdateEvent::CheckFailed {
                error: error_msg.clone(),
            },
        );
        error_msg
    })?;

    match updater.check().await {
        Ok(Some(update)) => {
            let current_version = app.package_info().version.to_string();
            let latest_version = update.version.to_string();
            let release_notes = update.body.clone();

            tracing::info!(current_version, latest_version, "Update available");

            {
                let mut state = UPDATE_STATE.lock().await;
                *state = Some(update);
            }

            let update_info = UpdateInfo {
                available: true,
                current_version,
                latest_version: Some(latest_version.clone()),
                release_notes,
            };

            if show_native_dialog {
                handle_portable_update_dialog(&app, &latest_version).await?;
            }

            let _ = app.emit(
                "updater-event",
                UpdateEvent::CheckCompleted {
                    info: update_info.clone(),
                },
            );

            Ok(update_info)
        }
        Ok(None) => {
            tracing::info!("No updates available");
            let update_info = UpdateInfo {
                available: false,
                current_version: app.package_info().version.to_string(),
                latest_version: None,
                release_notes: None,
            };

            let _ = app.emit(
                "updater-event",
                UpdateEvent::CheckCompleted {
                    info: update_info.clone(),
                },
            );

            Ok(update_info)
        }
        Err(e) => {
            let error_msg = format!("Failed to check for updates: {}", e);
            tracing::error!("{}", error_msg);
            let _ = app.emit(
                "updater-event",
                UpdateEvent::CheckFailed {
                    error: error_msg.clone(),
                },
            );
            Err(error_msg)
        }
    }
}

/// Download and install update (for standard mode)
/// Emits progress events that the frontend can listen to
#[tauri::command]
pub async fn download_and_install_update(app: AppHandle) -> Result<(), String> {
    tracing::info!("Starting update download and installation");

    let update = {
        let mut state = UPDATE_STATE.lock().await;
        state.take().ok_or("No update available to install")?
    };

    let _ = app.emit(
        "updater-event",
        UpdateEvent::DownloadStarted { total_bytes: None },
    );

    {
        let mut download_state = DOWNLOAD_STATE.lock().await;
        download_state.downloaded = 0;
        download_state.total = None;
        download_state.percentage = 0.0;
    }

    let app_progress = app.clone();
    let app_callback = app.clone();

    update
        .download_and_install(
            move |chunk_length, content_length| {
                let app = app_progress.clone();
                tauri::async_runtime::spawn(async move {
                    let mut download_state = DOWNLOAD_STATE.lock().await;

                    if let Some(total) = content_length {
                        if download_state.total.is_none() {
                            download_state.total = Some(total);
                            let _ = app.emit(
                                "updater-event",
                                UpdateEvent::DownloadStarted {
                                    total_bytes: Some(total),
                                },
                            );
                        }
                    }

                    download_state.downloaded += chunk_length as u64;

                    if let Some(total) = download_state.total {
                        download_state.percentage =
                            (download_state.downloaded as f64 / total as f64) * 100.0;
                    }

                    let progress = download_state.clone();
                    // Release the lock before emitting
                    // TODO: See if it's possible to not have a lock at all
                    drop(download_state);

                    let _ = app.emit("updater-event", UpdateEvent::DownloadProgress { progress });
                });
            },
            move || {
                let app = app_callback.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = app.emit("updater-event", UpdateEvent::DownloadCompleted);
                    let _ = app.emit("updater-event", UpdateEvent::InstallStarted);
                    let _ = app.emit("updater-event", UpdateEvent::RestartRequired);
                });
            },
        )
        .await
        .map_err(|e| {
            let error_msg = format!("Failed to download and install update: {}", e);
            let _ = app.emit(
                "updater-event",
                UpdateEvent::Error {
                    message: error_msg.clone(),
                },
            );
            error_msg
        })?;

    tracing::info!("Update download and installation completed successfully");
    Ok(())
}

/// Restart the application (for standard mode)
#[tauri::command]
pub async fn restart_application() -> Result<(), String> {
    tracing::info!("Restarting application");
    tauri::process::restart(&tauri::Env::default());
    // This function never returns because the app restarts,
    // so it's safe to allow `unreachable_code` here.
    #[allow(unreachable_code)]
    Ok(())
}

/// Cancel any ongoing update process
#[tauri::command]
pub async fn cancel_update(app: AppHandle) -> Result<(), String> {
    tracing::info!("Cancelling update");

    {
        let mut state = UPDATE_STATE.lock().await;
        *state = None;
    }

    {
        let mut download_state = DOWNLOAD_STATE.lock().await;
        download_state.downloaded = 0;
        download_state.total = None;
        download_state.percentage = 0.0;
    }

    let _ = app.emit("updater-event", UpdateEvent::UpdateCancelled);
    Ok(())
}

/// Get current download progress (for polling if needed)
#[tauri::command]
pub async fn get_download_progress() -> Result<DownloadProgress, String> {
    let download_state = DOWNLOAD_STATE.lock().await;
    Ok(download_state.clone())
}

/// Check if we're running in portable mode (for frontend convenience)
#[tauri::command]
pub fn is_portable_mode() -> bool {
    cfg!(feature = "portable")
}

/// Helper function to handle portable mode update dialog
async fn handle_portable_update_dialog(
    _app: &AppHandle,
    latest_version: &str,
) -> Result<(), String> {
    let download_url = "https://hoppscotch.com/download";
    let message = format!(
        "An update (version {}) is available for Hoppscotch Desktop (Portable).\n\nWould you like to download it now?\n\n• Yes = Download now\n• No = Remind me later",
        latest_version
    );

    if dialog::confirm("Download Update", &message, MessageType::Info) {
        if util::open_link(download_url).is_none() {
            dialog::error(&format!(
                "Failed to open download page. Please visit {}",
                download_url
            ));
            return Err("Failed to open download URL".to_string());
        }
    }

    Ok(())
}
