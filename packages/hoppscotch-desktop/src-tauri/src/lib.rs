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

use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_window_state::StateFlags;
use url::Url;

use random_port::{PortPicker, Protocol};

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

fn oauth_redirect_url_matches(candidate_url: &str, redirect_uri: &str) -> bool {
    let Ok(candidate) = Url::parse(candidate_url) else {
        return false;
    };
    let Ok(redirect) = Url::parse(redirect_uri) else {
        return false;
    };

    if candidate.scheme() != redirect.scheme()
        || candidate.username() != redirect.username()
        || candidate.password() != redirect.password()
        || candidate.host_str() != redirect.host_str()
        || candidate.port_or_known_default() != redirect.port_or_known_default()
        || candidate.path() != redirect.path()
    {
        return false;
    }

    if let Some(redirect_fragment) = redirect.fragment() {
        if candidate.fragment() != Some(redirect_fragment) {
            return false;
        }
    }

    redirect
        .query_pairs()
        .all(|(redirect_key, redirect_value)| {
            candidate
                .query_pairs()
                .any(|(candidate_key, candidate_value)| {
                    candidate_key == redirect_key && candidate_value == redirect_value
                })
        })
}

#[tauri::command]
async fn start_oauth2_flow(
    app: tauri::AppHandle,
    auth_url: String,
    redirect_uri: String,
) -> Result<(), String> {
    let parsed_auth_url = Url::parse(&auth_url).map_err(|_| "Invalid OAuth authorization URL")?;
    Url::parse(&redirect_uri).map_err(|_| "Invalid OAuth redirect URI")?;

    let _ = app
        .get_webview_window("oauth2-auth")
        .map(|window| window.close());

    let app_handle = app.clone();
    let redirect_uri_for_navigation = redirect_uri.clone();

    WebviewWindowBuilder::new(&app, "oauth2-auth", WebviewUrl::External(parsed_auth_url))
        .title("OAuth 2.0 Authorization")
        .inner_size(520.0, 720.0)
        .on_navigation(move |url| {
            let url = url.to_string();

            if !oauth_redirect_url_matches(&url, &redirect_uri_for_navigation) {
                return true;
            }

            if let Err(e) = app_handle.emit("oauth2-callback-received", url) {
                tracing::error!(
                    error.message = %e,
                    error.type = %std::any::type_name_of_val(&e),
                    "OAuth2 callback event emission failed"
                );
            }

            if let Some(window) = app_handle.get_webview_window("oauth2-auth") {
                let _ = window.close();
            }

            false
        })
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
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
    let server_port: u16 = PortPicker::new()
        .protocol(Protocol::Tcp)
        .port_range(15000..=25000)
        .pick()
        .map_err(|_| HoppError::ServerPortInitialization)?;

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
                    // NOTE: This menu bar will be visible on Linux. Removing it or hiding it
                    // also removes the accelerator registrations and breaks clipboard shortcuts
                    // (webkit2gtk requires native menu items to recognise Ctrl+C/V/X etc.).
                    // See https://github.com/tauri-apps/tauri/issues/2397
                    let menu = Menu::with_items(handle, &[&edit_menu])?;
                    app.set_menu(menu)?;
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
            start_oauth2_flow,
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

#[cfg(test)]
mod tests {
    use super::oauth_redirect_url_matches;

    #[test]
    fn oauth_redirect_matches_exact_redirect_uri() {
        assert!(oauth_redirect_url_matches(
            "https://example.com/oauth/callback?code=abc&state=xyz",
            "https://example.com/oauth/callback"
        ));
    }

    #[test]
    fn oauth_redirect_matches_redirect_uri_with_query_params() {
        assert!(oauth_redirect_url_matches(
            "https://example.com/oauth/callback?tenant=dev&code=abc&state=xyz",
            "https://example.com/oauth/callback?tenant=dev"
        ));
    }

    #[test]
    fn oauth_redirect_matches_implicit_callback_hash() {
        assert!(oauth_redirect_url_matches(
            "https://example.com/oauth/callback#access_token=abc&state=xyz",
            "https://example.com/oauth/callback"
        ));
    }

    #[test]
    fn oauth_redirect_rejects_unrelated_url() {
        assert!(!oauth_redirect_url_matches(
            "https://example.net/oauth/callback?code=abc&state=xyz",
            "https://example.com/oauth/callback"
        ));
    }

    #[test]
    fn oauth_redirect_rejects_missing_configured_query_param() {
        assert!(!oauth_redirect_url_matches(
            "https://example.com/oauth/callback?code=abc&state=xyz",
            "https://example.com/oauth/callback?tenant=dev"
        ));
    }
}
