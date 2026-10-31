pub mod backup;
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

use tauri::Emitter;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_window_state::StateFlags;

use config::HoppApploadConfig;
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
    let listener =
        server::bind_listener(15000..=25000).ok_or(HoppError::ServerPortInitialization)?;
    let server_port = listener.local_addr()?.port();

    tracing::info!("Selected server port: {}", server_port);
    SERVER_PORT
        .set(server_port)
        .map_err(|_| HoppError::ServerPortInitialization)?;

    let port = *SERVER_PORT
        .get()
        .ok_or(HoppError::ServerPortInitialization)?;
    tracing::info!(port = port, "Initializing server with pre-selected port");

    let port = server::init(listener, app.handle().clone())?;
    tracing::info!(port = port, "Server initialization complete");

    Ok(port)
}

async fn setup_version_backup(app: &tauri::App) -> Result<(), HoppError> {
    tracing::info!("Checking for version changes and performing backup if needed");

    let handle = app.handle().clone();
    match tauri::async_runtime::spawn_blocking(move || {
        backup::perform_version_check_and_backup(handle)
    })
    .await
    {
        Ok(Ok(_)) => {
            tracing::info!("Version backup check completed successfully");
            Ok(())
        }
        Ok(Err(e)) => {
            tracing::error!(
                error = %e,
                "Version backup check failed, but continuing with startup"
            );
            Ok(())
        }
        Err(e) => {
            tracing::error!(
                error = %e,
                "Version backup task panicked, but continuing with startup"
            );
            Ok(())
        }
    }
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
            // Set up native Edit menu to enable standard clipboard shortcuts (copy, paste, etc.)
            // Required on Linux where webkit2gtk does not handle these without menu items
            #[cfg(target_os = "linux")]
            {
                use tauri::menu::{Menu, PredefinedMenuItem, Submenu};
                use tauri::Manager;

                let result = (|| -> Result<(), Box<dyn std::error::Error>> {
                    let handle = app.handle();
                    let edit_menu = Submenu::with_items(
                        handle,
                        "Edit",
                        true,
                        &[
                            &PredefinedMenuItem::undo(handle, None)?,
                            &PredefinedMenuItem::redo(handle, None)?,
                            &PredefinedMenuItem::separator(handle)?,
                            &PredefinedMenuItem::cut(handle, None)?,
                            &PredefinedMenuItem::copy(handle, None)?,
                            &PredefinedMenuItem::paste(handle, None)?,
                            &PredefinedMenuItem::separator(handle)?,
                            &PredefinedMenuItem::select_all(handle, None)?,
                        ],
                    )?;
                    // The menu must be registered so webkit2gtk picks up the accelerators
                    // (Ctrl+C/V/X etc.), but the menu bar itself should be hidden so it
                    // does not appear as a visible "Edit" strip the user cannot dismiss.
                    // See https://github.com/tauri-apps/tauri/issues/2397
                    let menu = Menu::with_items(handle, &[&edit_menu])?;
                    app.set_menu(menu)?;

                    for (label, window) in app.webview_windows() {
                        if let Err(e) = window.hide_menu() {
                            tracing::warn!(?e, window_label = %label, "Failed to hide menu bar");
                        }
                    }
                    Ok(())
                })();

                if let Err(e) = result {
                    tracing::warn!(error = %e, "Failed to set up native Edit menu; clipboard shortcuts may not work");
                }
            }

            tauri::async_runtime::block_on(async {
                if let Err(e) = setup_version_backup(app).await {
                    tracing::error!(error = %e, "Failed to setup version backup");
                    return Err(e.into());
                }

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
            quit_app,
            backup::check_and_backup_on_version_change,
            config::set_desktop_config,
            updater::check_for_updates,
            updater::download_and_install_update,
            updater::restart_application,
            updater::cancel_update,
            updater::get_download_progress,
            updater::is_portable_mode,
            path::get_config_dir,
            path::get_latest_dir,
            path::get_instance_dir,
            path::get_store_dir,
            path::get_backup_dir,
            path::get_logs_dir,
            logger::append_log,
            path::read_log,
            path::get_appload_registry,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = app {
        tracing::error!(error = %e, "Error while running Hoppscotch Desktop");
    }
}

// WebView2 serves a bundle loaded at `app://<bundle>/` from
// `http://app.<bundle>/`, and Tauri treats that as a remote origin, so on
// Windows every call a bundle makes is checked against the remote URLs and
// the app command permissions in `capabilities/default.json`.
#[cfg(test)]
mod capability_tests {
    use std::collections::BTreeSet;

    use tauri::utils::acl::RemoteUrlPattern;
    use tauri::Url;

    const DEFAULT_CAPABILITY: &str = include_str!("../capabilities/default.json");
    const BUILD_SCRIPT: &str = include_str!("../build.rs");
    const LIB: &str = include_str!("lib.rs");

    fn remote_patterns() -> Vec<RemoteUrlPattern> {
        let capability: serde_json::Value = serde_json::from_str(DEFAULT_CAPABILITY).unwrap();
        capability["remote"]["urls"]
            .as_array()
            .unwrap()
            .iter()
            .map(|url| url.as_str().unwrap().parse().unwrap())
            .collect()
    }

    fn is_granted(url: &str) -> bool {
        let url = Url::parse(url).unwrap();
        remote_patterns().iter().any(|pattern| pattern.test(&url))
    }

    fn quoted_names(block: &str) -> BTreeSet<String> {
        block
            .split('"')
            .skip(1)
            .step_by(2)
            .map(str::to_string)
            .collect()
    }

    #[test]
    fn test_bundle_origins_on_windows_are_granted() {
        assert!(is_granted("http://app.hoppscotch/"));
        assert!(is_granted("http://app.hoppscotch/?org=acme.hoppscotch.io"));
        assert!(is_granted("http://app.my_instance_2/settings"));
        assert!(is_granted("http://app.xn--hppscotch-n7a/"));
        assert!(is_granted("app://hoppscotch/"));
    }

    #[test]
    fn test_sites_outside_the_bundle_origins_are_refused() {
        assert!(!is_granted("http://app.evil.com/"));
        assert!(!is_granted("http://app.hoppscotch.evil.com/"));
        assert!(!is_granted("https://app.hoppscotch/"));
        assert!(!is_granted("http://app.hoppscotch:8080/"));
        assert!(!is_granted("http://evil.com/?next=app.hoppscotch"));
        assert!(!is_granted("http://hoppscotch/"));
    }

    #[test]
    fn test_every_app_command_has_a_granted_permission() {
        let handler = LIB
            .split("generate_handler![")
            .nth(1)
            .and_then(|rest| rest.split(']').next())
            .unwrap();
        let registered: BTreeSet<String> = handler
            .split(',')
            .map(|path| path.trim().rsplit("::").next().unwrap().to_string())
            .filter(|name| !name.is_empty())
            .collect();

        let manifest = BUILD_SCRIPT
            .split("APP_COMMANDS: &[&str] = &[")
            .nth(1)
            .and_then(|rest| rest.split("];").next())
            .unwrap();
        assert_eq!(quoted_names(manifest), registered);

        let capability: serde_json::Value = serde_json::from_str(DEFAULT_CAPABILITY).unwrap();
        let granted: BTreeSet<String> = capability["permissions"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|permission| permission.as_str()?.strip_prefix("allow-"))
            .map(|command| command.replace('-', "_"))
            .collect();
        assert_eq!(granted, registered);
    }
}
