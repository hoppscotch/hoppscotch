use crate::{dialog, util};
use native_dialog::MessageType;
use tauri_plugin_updater::UpdaterExt;

/// Check for updates using the updater and return whether updates are available
/// This mimics the behavior of `checkForUpdates` in `updater.ts` but uses native dialogs when needed
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    tracing::info!("Checking for portable updates");

    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(e) => {
            tracing::error!(error = %e, "Failed to initialize updater");
            return Err(format!("Failed to initialize updater: {}", e));
        }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            tracing::info!(
                current_version = app.package_info().version.to_string(),
                update_version = update.version.to_string(),
                "Update available"
            );
            let download_url = "https://hoppscotch.com/download";
            let message = format!(
                "An update (version {}) is available for Hoppscotch Desktop (Portable).\n\nWould you like to download it now?\n\n• Yes = Download now\n• No = Remind me later",
                update.version
            );

            if dialog::confirm("Download Update", &message, MessageType::Info) {
                if let None = util::open_link(download_url) {
                    dialog::error(&format!(
                        "Failed to open download page. Please visit {}",
                        download_url
                    ));
                    return Err(format!("Failed to open download URL"));
                }
            }

            Ok(true)
        }
        Ok(None) => {
            tracing::info!("No updates available");
            Ok(false)
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to check for updates");
            Err(format!("Failed to check for updates: {}", e))
        }
    }
}
