use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
pub async fn check_updates_available(app: tauri::AppHandle) -> Result<bool, String> {
    tracing::info!("Checking for updates...");
    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(e) => {
            tracing::error!(error = %e, "Failed to initialize updater");
            return Ok(false);
        }
    };

    match updater.check().await {
        Ok(Some(_update)) => {
            tracing::info!("Update available");
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

#[tauri::command]
pub async fn install_updates_and_restart(app: tauri::AppHandle) -> Result<(), String> {
    tracing::info!("Installing updates...");
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
                "Installing update"
            );

            let dialog = app.dialog();
            let should_update = dialog
                .message(format!(
                    "A new version of Hoppscotch (v{}) is available.\n\n{}",
                    update.version,
                    update.body.as_ref().unwrap_or(&"".to_string())
                ))
                .title("Update Available")
                .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                .buttons(tauri_plugin_dialog::MessageDialogButtons::YesNo)
                .blocking_show();

            if should_update {
                tracing::info!("User agreed to update, starting download...");
                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(_) => {
                        tracing::info!("Update installed successfully, restarting app");
                        app.restart();
                        Err("Unreachable - app should have restarted".to_string())
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "Failed to download or install update");
                        let _ = app
                            .dialog()
                            .message(format!("Failed to install update: {}", e))
                            .title("Update Error")
                            .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                            .blocking_show();
                        Err(format!("Failed to download or install update: {}", e))
                    }
                }
            } else {
                tracing::info!("User declined the update");
                Ok(())
            }
        }
        Ok(None) => {
            tracing::info!("No updates available");
            Ok(())
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to check for updates");
            Err(format!("Failed to check for updates: {}", e))
        }
    }
}
