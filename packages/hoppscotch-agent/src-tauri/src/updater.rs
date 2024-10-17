#[cfg(desktop)]
pub async fn check_and_install_updates(
    app: tauri::AppHandle,
    updater: tauri_plugin_updater::Updater,
) {
    use tauri::Manager;
    use tauri_plugin_dialog::DialogExt;
    use tauri_plugin_dialog::MessageDialogButtons;
    use tauri_plugin_dialog::MessageDialogKind;

    let update = updater.check().await;

    if let Ok(Some(update)) = update {
        let do_update = app
            .dialog()
            .message(format!(
                "Update to {} is available!{}",
                update.version,
                update
                    .body
                    .clone()
                    .map(|body| format!("\n\nRelease Notes: {}", body))
                    .unwrap_or("".into())
            ))
            .title("Update Available")
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Update".to_string(),
                "Cancel".to_string(),
            ))
            .blocking_show();

        if do_update {
            let _ = update.download_and_install(|_, _| {}, || {}).await;

            tauri::process::restart(&app.env());
        }
    }
}
