pub mod config;
pub mod dialog;
pub mod error;
pub mod logger;
pub mod path;
pub mod server;
pub mod updater;
pub mod util;
pub mod webview;

use std::sync::OnceLock;

use config::HoppApploadConfig;
use tauri::Emitter;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_window_state::StateFlags;

use error::HoppError;

static SERVER_PORT: OnceLock<u16> = OnceLock::new();

#[tauri::command]
fn is_portable() -> bool {
    cfg!(feature = "portable")
}

#[tauri::command]
fn hopp_auth_port() -> u16 {
    SERVER_PORT
        .get()
        .copied()
        .expect("Server port not initialized")
}

fn setup_deep_link_handler(app: &tauri::App) -> Result<(), HoppError> {
    let handle = app.handle().clone();

    app.deep_link().on_open_url(move |event| {
        let urls = event.urls();
        tracing::info!(
            urls = ?urls,
            count = urls.len(),
            "Processing deep link request"
        );

        if let Err(e) = handle.emit("scheme-request-received", urls) {
            tracing::error!(
                error.message = %e,
                error.type = %std::any::type_name_of_val(&e),
                "Deep link event emission failed"
            );
        }
    });

    tracing::info!(app_name = %app.package_info().name, "Configured deep link handler");
    Ok(())
}

fn setup_server(app: &tauri::App) -> Result<u16, HoppError> {
    let server_port = portpicker::pick_unused_port().ok_or(HoppError::ServerPortInitialization)?;

    tracing::info!("Selected server port: {}", server_port);

    SERVER_PORT
        .set(server_port)
        .map_err(|_| HoppError::ServerPortInitialization)?;

    let port = *SERVER_PORT
        .get()
        .ok_or(HoppError::ServerPortInitialization)?;
    tracing::info!(port = port, "Initializing server with pre-selected port");

    let port = server::init(port, app.handle().clone());
    tracing::info!(port = port, "Server initialization complete");

    Ok(port)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mode = if cfg!(feature = "portable") {
        "portable"
    } else {
        "standard"
    };
    tracing::info!(mode = mode, "Hoppscotch Desktop running in {} mode", mode);

    #[cfg(all(feature = "portable", windows))]
    {
        tracing::debug!("Checking WebView initialization for portable Windows variant");
        webview::init_webview();
    }

    let appload_config = match HoppApploadConfig::new() {
        Ok(config) => config,
        Err(e) => {
            tracing::error!(error = %e, "Failed to initialize application configuration");
            return;
        }
    };

    if let Err(e) = appload_config.write_vendored() {
        tracing::error!(error = %e, "Failed to write bundled files");
        return;
    }

    let appload_config = appload_config.build();

    let app = tauri::Builder::default()
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                if let Err(e) = setup_server(app) {
                    tracing::error!(error = %e, "Failed to setup server");
                    return Err(e.into());
                }

                if let Err(e) = setup_deep_link_handler(app) {
                    tracing::error!(error = %e, "Failed to setup deep link handler");
                    return Err(e.into());
                }

                tracing::info!("Starting Hoppscotch Desktop v{}", env!("CARGO_PKG_VERSION"));
                Ok(())
            })
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
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_appload::init(appload_config))
        .plugin(tauri_plugin_relay::init())
        .invoke_handler(tauri::generate_handler![
            is_portable,
            hopp_auth_port,
            updater::check_for_updates,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = app {
        tracing::error!(error = %e, "Error while running Hoppscotch Desktop");
    }
}
