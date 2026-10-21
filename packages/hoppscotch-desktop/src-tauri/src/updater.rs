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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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

#[derive(Debug, Clone, PartialEq)]
pub struct ProgressTracker {
    pub downloaded: u64,
    pub total: Option<u64>,
    pub percentage: f64,
    last_emitted_percent: Option<u32>,
    last_emitted_bytes: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ChunkEffect {
    pub progress: Option<DownloadProgress>,
    pub new_total: Option<u64>,
}

impl ProgressTracker {
    pub fn new() -> Self {
        Self {
            downloaded: 0,
            total: None,
            percentage: 0.0,
            last_emitted_percent: None,
            last_emitted_bytes: 0,
        }
    }

    pub fn reset(&mut self) {
        self.downloaded = 0;
        self.total = None;
        self.percentage = 0.0;
        self.last_emitted_percent = None;
        self.last_emitted_bytes = 0;
    }

    pub fn current_progress(&self) -> DownloadProgress {
        DownloadProgress {
            downloaded: self.downloaded,
            total: self.total,
            percentage: self.percentage,
        }
    }

    pub fn handle_chunk(
        &mut self,
        chunk_length: usize,
        content_length: Option<u64>,
    ) -> ChunkEffect {
        let mut new_total = None;
        if self.total.is_none() {
            if let Some(total) = content_length {
                if total > 0 {
                    self.total = Some(total);
                    new_total = Some(total);
                }
            }
        }

        self.downloaded = self.downloaded.saturating_add(chunk_length as u64);

        let mut should_emit = false;

        if let Some(total) = self.total {
            if total > 0 {
                let raw_pct = (self.downloaded as f64 / total as f64) * 100.0;
                let clamped = if raw_pct.is_nan() {
                    0.0
                } else {
                    raw_pct.clamp(0.0, 100.0)
                };

                // Keep progress monotonic
                if clamped > self.percentage {
                    self.percentage = clamped;
                }

                let integer_percent = self.percentage.floor() as u32;

                // Reserve 100% for finalize_download so download completion is distinct
                if integer_percent < 100 {
                    match self.last_emitted_percent {
                        None => {
                            self.last_emitted_percent = Some(integer_percent);
                            should_emit = true;
                        }
                        Some(last) if integer_percent > last => {
                            self.last_emitted_percent = Some(integer_percent);
                            should_emit = true;
                        }
                        _ => {}
                    }
                }
            }
        } else {
            // Unknown total content length
            // Throttle by byte threshold (emit on first chunk and every 512 KiB)
            const BYTE_THROTTLE_THRESHOLD: u64 = 512 * 1024;
            if self.last_emitted_bytes == 0
                || self.downloaded.saturating_sub(self.last_emitted_bytes)
                    >= BYTE_THROTTLE_THRESHOLD
            {
                self.last_emitted_bytes = self.downloaded;
                should_emit = true;
            }
        }

        let progress = if should_emit {
            Some(self.current_progress())
        } else {
            None
        };

        ChunkEffect {
            progress,
            new_total,
        }
    }

    pub fn finalize_download(&mut self) -> DownloadProgress {
        if let Some(total) = self.total {
            if self.downloaded < total {
                self.downloaded = total;
            }
        } else if self.total.is_none() && self.downloaded > 0 {
            self.total = Some(self.downloaded);
        }
        self.percentage = 100.0;
        self.last_emitted_percent = Some(100);
        self.current_progress()
    }
}

static DOWNLOAD_STATE: std::sync::LazyLock<std::sync::Mutex<ProgressTracker>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(ProgressTracker::new()));

fn lock_download_state() -> std::sync::MutexGuard<'static, ProgressTracker> {
    DOWNLOAD_STATE.lock().unwrap_or_else(|p| p.into_inner())
}

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
        let mut tracker = lock_download_state();
        tracker.reset();
    }

    let app_progress = app.clone();
    let app_callback = app.clone();

    update
        .download_and_install(
            move |chunk_length, content_length| {
                let effect = {
                    let mut tracker = lock_download_state();
                    tracker.handle_chunk(chunk_length, content_length)
                };

                if let Some(total) = effect.new_total {
                    let _ = app_progress.emit(
                        "updater-event",
                        UpdateEvent::DownloadStarted {
                            total_bytes: Some(total),
                        },
                    );
                }

                if let Some(progress) = effect.progress {
                    let _ = app_progress
                        .emit("updater-event", UpdateEvent::DownloadProgress { progress });
                }
            },
            move || {
                let final_progress = {
                    let mut tracker = lock_download_state();
                    tracker.finalize_download()
                };

                let _ = app_callback.emit(
                    "updater-event",
                    UpdateEvent::DownloadProgress {
                        progress: final_progress,
                    },
                );
                let _ = app_callback.emit("updater-event", UpdateEvent::DownloadCompleted);
                let _ = app_callback.emit("updater-event", UpdateEvent::InstallStarted);
            },
        )
        .await
        .map_err(|e| {
            let error_msg = format!("Failed to download and install update: {}", e);
            tracing::error!("{}", error_msg);
            let _ = app.emit(
                "updater-event",
                UpdateEvent::Error {
                    message: error_msg.clone(),
                },
            );
            error_msg
        })?;

    let _ = app.emit("updater-event", UpdateEvent::InstallCompleted);
    let _ = app.emit("updater-event", UpdateEvent::RestartRequired);

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
        let mut tracker = lock_download_state();
        tracker.reset();
    }

    let _ = app.emit("updater-event", UpdateEvent::UpdateCancelled);
    Ok(())
}

/// Get current download progress (for polling if needed)
#[tauri::command]
pub async fn get_download_progress() -> Result<DownloadProgress, String> {
    let tracker = lock_download_state();
    Ok(tracker.current_progress())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_increasing_progress_and_duplicate_suppression() {
        let mut tracker = ProgressTracker::new();
        let total = 1_000u64;

        // Chunk 1: 5 bytes (0.5% -> floor is 0). First chunk emits 0%.
        let effect1 = tracker.handle_chunk(5, Some(total));
        assert_eq!(effect1.new_total, Some(total));
        assert!(effect1.progress.is_some());
        let p1 = effect1.progress.unwrap();
        assert_eq!(p1.downloaded, 5);
        assert!((p1.percentage - 0.5).abs() < f64::EPSILON);

        // Chunk 2: 4 bytes (9 bytes total -> 0.9% -> floor is 0).
        // 0% was already emitted, so duplicate percent is suppressed.
        let effect2 = tracker.handle_chunk(4, Some(total));
        assert_eq!(effect2.new_total, None);
        assert!(effect2.progress.is_none());

        // Chunk 3: 5 bytes (14 bytes total -> 1.4% -> floor is 1).
        // Advances to 1%, emits progress.
        let effect3 = tracker.handle_chunk(5, Some(total));
        assert!(effect3.progress.is_some());
        let p3 = effect3.progress.unwrap();
        assert_eq!(p3.downloaded, 14);
        assert!((p3.percentage - 1.4).abs() < 1e-10);

        // Chunk 4: 1 byte (15 bytes total -> 1.5% -> floor is 1). Suppressed.
        let effect4 = tracker.handle_chunk(1, Some(total));
        assert!(effect4.progress.is_none());
    }

    #[test]
    fn test_monotonic_progress() {
        let mut tracker = ProgressTracker::new();
        let total = 100u64;

        let effect1 = tracker.handle_chunk(50, Some(total));
        assert!(effect1.progress.is_some());
        assert_eq!(tracker.percentage, 50.0);

        // Even with a 0-length chunk, percentage never decreases.
        let _ = tracker.handle_chunk(0, Some(total));
        assert_eq!(tracker.percentage, 50.0);
    }

    #[test]
    fn test_unknown_content_length() {
        let mut tracker = ProgressTracker::new();

        // First chunk emits initial progress with unknown total
        let effect1 = tracker.handle_chunk(100 * 1024, None);
        assert_eq!(effect1.new_total, None);
        assert!(effect1.progress.is_some());
        let p1 = effect1.progress.unwrap();
        assert_eq!(p1.downloaded, 100 * 1024);
        assert_eq!(p1.total, None);
        assert_eq!(p1.percentage, 0.0);

        // Second chunk below 512 KiB delta -> suppressed
        let effect2 = tracker.handle_chunk(100 * 1024, None);
        assert!(effect2.progress.is_none());

        // Third chunk crosses 512 KiB delta -> emits
        let effect3 = tracker.handle_chunk(420 * 1024, None);
        assert!(effect3.progress.is_some());
        let p3 = effect3.progress.unwrap();
        assert_eq!(p3.downloaded, 620 * 1024);
        assert_eq!(p3.total, None);

        // Finalize sets 100% and resolves total to downloaded bytes
        let final_p = tracker.finalize_download();
        assert_eq!(final_p.percentage, 100.0);
        assert_eq!(final_p.total, Some(620 * 1024));
        assert_eq!(final_p.downloaded, 620 * 1024);
    }

    #[test]
    fn test_zero_content_length() {
        let mut tracker = ProgressTracker::new();

        // Some(0) must not cause division by zero or NaN
        let effect = tracker.handle_chunk(1024, Some(0));
        assert_eq!(effect.new_total, None);
        assert_eq!(tracker.percentage, 0.0);

        let final_p = tracker.finalize_download();
        assert_eq!(final_p.percentage, 100.0);
    }

    #[test]
    fn test_completion_reaching_100_percent() {
        let mut tracker = ProgressTracker::new();
        let total = 200u64;

        // Chunks reaching 100% bytes do not emit 100% in chunk handler
        let _ = tracker.handle_chunk(100, Some(total));
        let effect = tracker.handle_chunk(100, Some(total));
        assert!(effect.progress.is_none()); // 100% reserved for finalize_download

        // finalize_download produces the final 100% event
        let final_p = tracker.finalize_download();
        assert_eq!(final_p.percentage, 100.0);
        assert_eq!(final_p.downloaded, 200);
        assert_eq!(final_p.total, Some(200));
    }

    #[test]
    fn test_large_download_sizes_no_overflow() {
        let mut tracker = ProgressTracker::new();
        // 10 GB file
        let total = 10 * 1024 * 1024 * 1024u64;
        let chunk = 100 * 1024 * 1024usize; // 100 MB

        let effect = tracker.handle_chunk(chunk, Some(total));
        assert!(effect.progress.is_some());
        let p = effect.progress.unwrap();
        assert_eq!(p.downloaded, 100 * 1024 * 1024);
        assert!(p.percentage > 0.0);

        // Saturating add prevents overflow even at u64 limits
        tracker.downloaded = u64::MAX - 10;
        let _effect_overflow = tracker.handle_chunk(50, Some(total));
        assert_eq!(tracker.downloaded, u64::MAX);
    }

    #[test]
    fn test_reset() {
        let mut tracker = ProgressTracker::new();
        let _ = tracker.handle_chunk(100, Some(1000));
        assert!(tracker.downloaded > 0);

        tracker.reset();
        assert_eq!(tracker.downloaded, 0);
        assert_eq!(tracker.total, None);
        assert_eq!(tracker.percentage, 0.0);
        assert_eq!(tracker.last_emitted_percent, None);
        assert_eq!(tracker.last_emitted_bytes, 0);
    }
}
