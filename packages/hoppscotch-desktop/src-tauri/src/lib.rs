pub mod logger;
pub mod server;
pub mod updater;

use std::sync::OnceLock;

use tauri::{Emitter, Manager};
use tauri_plugin_appload::VendorConfigBuilder;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_window_state::StateFlags;

pub const HOPPSCOTCH_DESKTOP_IDENTIFIER: &'static str = "io.hoppscotch.desktop";
static SERVER_PORT: OnceLock<u16> = OnceLock::new();

#[tauri::command]
fn hopp_auth_port() -> u16 {
    *SERVER_PORT.get().expect("Server port not initialized")
}

/// Gracefully quit the Hoppscotch Desktop
///
/// This command is invoked from the frontend when the user triggers
/// the quit action (typically via Cmd+Q/Ctrl+Q keyboard shortcut).
///
/// It performs a clean shutdown by logging the quit request
/// for debugging and then calling `app.exit(0)` which triggers
/// v2's graceful shutdown.
///
/// It basically trigger `RunEvent::ExitRequested`
/// followed by `RunEvent::Exit` events.
/// See https://docs.rs/tauri/latest/tauri/struct.AppHandle.html#method.exit
#[tauri::command]
fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    tracing::info!("Quit command received, shutting down application");
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let server_port = portpicker::pick_unused_port().expect("Cannot find unused port");
            tracing::info!("Selected server port: {}", server_port);
            SERVER_PORT
                .set(server_port)
                .expect("Failed to set server port");
            let port = *SERVER_PORT.get().expect("Server port not initialized");
            tracing::info!(port = port, "Initializing server with pre-selected port");
            let port = server::init(port, app.handle().clone());
            tracing::info!(port = port, "Server initialization complete");

            tracing::info!(app_name = %app.package_info().name, "Configuring deep link handler");
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                tracing::info!(
                    urls = ?urls,
                    count = urls.len(),
                    "Processing deep link request"
                );
                handle
                    .emit("scheme-request-received", urls)
                    .unwrap_or_else(|e| {
                        tracing::error!(
                            error.message = %e,
                            error.type = %std::any::type_name_of_val(&e),
                            "Deep link event emission failed"
                        );
                    });
            });

            tracing::info!("Starting Hoppscotch Desktop v{}", env!("CARGO_PKG_VERSION"));

            Ok(())
        })
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(
                    StateFlags::SIZE
                        | StateFlags::POSITION
                        | StateFlags::MAXIMIZED
                        | StateFlags::FULLSCREEN,
                )
                .with_denylist(&["main"])
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_appload::init(
            VendorConfigBuilder::new().bundle(
                include_bytes!("../../bundle.zip").to_vec(),
                include_bytes!("../../manifest.json"),
            ),
        ))
        .plugin(tauri_plugin_relay::init())
        .invoke_handler(tauri::generate_handler![
            hopp_auth_port,
            updater::check_updates_available,
            updater::install_updates_and_restart,
            quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
