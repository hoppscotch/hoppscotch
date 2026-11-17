use crate::{dialog, util};
use native_dialog::MessageType;
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::sync::{Arc, PoisonError};
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::sync::Mutex;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
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

// The updater's chunk callback is synchronous and never holds this lock
// across an await, so a std mutex fits.
static DOWNLOAD_STATE: std::sync::LazyLock<Arc<std::sync::Mutex<DownloadProgress>>> =
    std::sync::LazyLock::new(|| {
        Arc::new(std::sync::Mutex::new(DownloadProgress {
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
        let mut download_state = DOWNLOAD_STATE
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        download_state.downloaded = 0;
        download_state.total = None;
        download_state.percentage = 0.0;
    }

    let app_progress = app.clone();
    let app_callback = app.clone();
    let mut last_emitted_percent: Option<u64> = None;

    let install = update.download_and_install(
        move |chunk_length, content_length| {
            // Updating and emitting inline keeps events in chunk order.
            let events = {
                let mut download_state = DOWNLOAD_STATE
                    .lock()
                    .unwrap_or_else(PoisonError::into_inner);
                apply_chunk(
                    &mut download_state,
                    &mut last_emitted_percent,
                    chunk_length,
                    content_length,
                )
            };
            for event in events {
                let _ = app_progress.emit("updater-event", event);
            }
        },
        move || {
            // Installation starts after this callback returns, so
            // `RestartRequired` is emitted by `finish_install` once
            // `download_and_install` returns instead.
            let _ = app_callback.emit("updater-event", UpdateEvent::DownloadCompleted);
            let _ = app_callback.emit("updater-event", UpdateEvent::InstallStarted);
        },
    );

    finish_install(install, |event| {
        let _ = app.emit("updater-event", event);
    })
    .await
}

/// Applies one downloaded chunk to `state` and returns the events it calls
/// for, in order.
///
/// `DownloadStarted` reports the total the first time the server sends one.
/// Progress is emitted once per whole percent, which caps a download at about
/// a hundred progress events instead of one per network chunk. Without a
/// total there is no percent to compare, so every chunk is emitted.
fn apply_chunk(
    state: &mut DownloadProgress,
    last_emitted_percent: &mut Option<u64>,
    chunk_length: usize,
    content_length: Option<u64>,
) -> Vec<UpdateEvent> {
    let mut events = Vec::new();

    if let Some(total) = content_length {
        if state.total.is_none() {
            state.total = Some(total);
            events.push(UpdateEvent::DownloadStarted {
                total_bytes: Some(total),
            });
        }
    }

    state.downloaded += chunk_length as u64;

    // A total of 0 would divide to NaN or infinity, and the frontend reads
    // `percentage` from this state, so it stays at 0, as with no total.
    if let Some(total) = state.total.filter(|&total| total > 0) {
        state.percentage = (state.downloaded as f64 * 100.0) / total as f64;
    }

    // Integer division, since a float divided before it is multiplied lands
    // just under some whole percents, 29 of 100 bytes as 28.999..., and the
    // step to 29% was skipped. A total of 0 has no percent, so every chunk is
    // emitted.
    let percent = state.total.and_then(|total| {
        (state.downloaded as u128 * 100)
            .checked_div(total as u128)
            .map(|p| p as u64)
    });
    if percent.is_none() || percent != *last_emitted_percent {
        *last_emitted_percent = percent;
        events.push(UpdateEvent::DownloadProgress {
            progress: state.clone(),
        });
    }

    events
}

/// Awaits the download and install, then emits what follows it.
///
/// `RestartRequired` is emitted only after `install` resolves `Ok`, since the
/// plugin replaces the app bundle after the download-finish callback returns,
/// and a restart before that leaves a partly extracted bundle in place.
async fn finish_install<E: std::fmt::Display>(
    install: impl Future<Output = Result<(), E>>,
    emit: impl Fn(UpdateEvent),
) -> Result<(), String> {
    if let Err(e) = install.await {
        let error_msg = format!("Failed to download and install update: {}", e);
        emit(UpdateEvent::Error {
            message: error_msg.clone(),
        });
        return Err(error_msg);
    }

    tracing::info!("Update download and installation completed successfully");
    emit(UpdateEvent::InstallCompleted);
    emit(UpdateEvent::RestartRequired);
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
        let mut download_state = DOWNLOAD_STATE
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
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
    let download_state = DOWNLOAD_STATE
        .lock()
        .unwrap_or_else(PoisonError::into_inner);
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    fn fresh() -> (DownloadProgress, Option<u64>) {
        (
            DownloadProgress {
                downloaded: 0,
                total: None,
                percentage: 0.0,
            },
            None,
        )
    }

    fn progress_events(events: &[UpdateEvent]) -> Vec<DownloadProgress> {
        events
            .iter()
            .filter_map(|e| match e {
                UpdateEvent::DownloadProgress { progress } => Some(progress.clone()),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn download_started_carries_the_total_once() {
        let (mut state, mut last) = fresh();
        let first = apply_chunk(&mut state, &mut last, 10, Some(1000));
        let second = apply_chunk(&mut state, &mut last, 10, Some(1000));

        assert_eq!(
            first[0],
            UpdateEvent::DownloadStarted {
                total_bytes: Some(1000)
            }
        );
        assert!(!second
            .iter()
            .any(|e| matches!(e, UpdateEvent::DownloadStarted { .. })));
    }

    #[test]
    fn progress_is_emitted_once_per_whole_percent() {
        let (mut state, mut last) = fresh();
        let mut all = Vec::new();
        // 10,000 bytes in 1-byte chunks is 100 chunks per percent
        for _ in 0..10_000 {
            all.extend(apply_chunk(&mut state, &mut last, 1, Some(10_000)));
        }
        let progress = progress_events(&all);

        // 0% on the first chunk, then 1% to 100%
        assert_eq!(progress.len(), 101);
        let percents: Vec<u64> = progress
            .iter()
            .map(|p| p.percentage.floor() as u64)
            .collect();
        assert_eq!(percents, (0..=100).collect::<Vec<_>>());
    }

    #[test]
    fn no_percent_is_skipped_when_the_float_lands_under_it() {
        let (mut state, mut last) = fresh();
        let mut all = Vec::new();
        // 29, 57 and 58 of 100 bytes, divided before multiplying, each land
        // just under the percent
        for _ in 0..100 {
            all.extend(apply_chunk(&mut state, &mut last, 1, Some(100)));
        }
        let downloaded: Vec<u64> = progress_events(&all).iter().map(|p| p.downloaded).collect();

        assert_eq!(downloaded, (1..=100).collect::<Vec<_>>());
    }

    #[test]
    fn progress_is_in_chunk_order_and_ends_at_the_total() {
        let (mut state, mut last) = fresh();
        let mut all = Vec::new();
        for chunk in [300, 300, 300, 100] {
            all.extend(apply_chunk(&mut state, &mut last, chunk, Some(1000)));
        }
        let progress = progress_events(&all);

        let downloaded: Vec<u64> = progress.iter().map(|p| p.downloaded).collect();
        assert_eq!(downloaded, vec![300, 600, 900, 1000]);
        assert_eq!(progress.last().unwrap().percentage, 100.0);
        assert_eq!(state.downloaded, 1000);
    }

    #[test]
    fn a_large_chunk_spanning_several_percents_emits_once() {
        let (mut state, mut last) = fresh();
        let events = apply_chunk(&mut state, &mut last, 500, Some(1000));
        let progress = progress_events(&events);

        assert_eq!(progress.len(), 1);
        assert_eq!(progress[0].percentage, 50.0);
    }

    #[test]
    fn without_a_total_every_chunk_is_emitted_and_percentage_stays_zero() {
        let (mut state, mut last) = fresh();
        let mut all = Vec::new();
        for _ in 0..5 {
            all.extend(apply_chunk(&mut state, &mut last, 100, None));
        }
        let progress = progress_events(&all);

        assert!(!all
            .iter()
            .any(|e| matches!(e, UpdateEvent::DownloadStarted { .. })));
        assert_eq!(progress.len(), 5);
        assert!(progress.iter().all(|p| p.total.is_none()));
        assert!(progress.iter().all(|p| p.percentage == 0.0));
        assert_eq!(progress.last().unwrap().downloaded, 500);
    }

    #[test]
    fn a_total_of_zero_keeps_percentage_at_zero_and_emits_every_chunk() {
        let (mut state, mut last) = fresh();
        let mut all = Vec::new();
        for _ in 0..3 {
            all.extend(apply_chunk(&mut state, &mut last, 100, Some(0)));
        }
        let progress = progress_events(&all);

        assert_eq!(progress.len(), 3);
        assert!(progress.iter().all(|p| p.percentage == 0.0));
    }

    #[test]
    fn a_total_reported_after_the_first_chunk_is_picked_up() {
        let (mut state, mut last) = fresh();
        let mut all = apply_chunk(&mut state, &mut last, 100, None);
        all.extend(apply_chunk(&mut state, &mut last, 100, Some(1000)));

        assert!(all.contains(&UpdateEvent::DownloadStarted {
            total_bytes: Some(1000)
        }));
        assert_eq!(state.total, Some(1000));
        assert_eq!(state.percentage, 20.0);
    }

    #[test]
    fn restart_is_emitted_only_after_the_install_resolves() {
        // One log for both the emitted events and the install finishing, so
        // the test sees their relative order.
        let log: RefCell<Vec<String>> = RefCell::new(Vec::new());

        let install = async {
            log.borrow_mut().push("installed".into());
            Ok::<(), String>(())
        };
        let result = tauri::async_runtime::block_on(finish_install(install, |event| {
            log.borrow_mut().push(format!("{:?}", event));
        }));

        assert!(result.is_ok());
        assert_eq!(
            *log.borrow(),
            vec!["installed", "InstallCompleted", "RestartRequired"]
        );
    }

    #[test]
    fn a_failed_install_emits_an_error_and_no_restart() {
        let events: RefCell<Vec<UpdateEvent>> = RefCell::new(Vec::new());

        let install = async { Err::<(), _>("signature mismatch") };
        let result = tauri::async_runtime::block_on(finish_install(install, |event| {
            events.borrow_mut().push(event);
        }));

        let message = "Failed to download and install update: signature mismatch";
        assert_eq!(result, Err(message.to_string()));
        assert_eq!(
            *events.borrow(),
            vec![UpdateEvent::Error {
                message: message.into()
            }]
        );
    }

    #[test]
    fn events_serialize_in_the_shape_the_frontend_reads() {
        // `updater.client.ts` switches on `type` and reads `totalBytes`
        let started = serde_json::to_value(UpdateEvent::DownloadStarted {
            total_bytes: Some(42),
        })
        .unwrap();
        assert_eq!(
            started,
            serde_json::json!({ "type": "DownloadStarted", "totalBytes": 42 })
        );

        let restart = serde_json::to_value(UpdateEvent::RestartRequired).unwrap();
        assert_eq!(restart, serde_json::json!({ "type": "RestartRequired" }));

        let progress = serde_json::to_value(UpdateEvent::DownloadProgress {
            progress: DownloadProgress {
                downloaded: 5,
                total: Some(10),
                percentage: 50.0,
            },
        })
        .unwrap();
        assert_eq!(
            progress,
            serde_json::json!({
                "type": "DownloadProgress",
                "progress": { "downloaded": 5, "total": 10, "percentage": 50.0 }
            })
        );
    }
}
