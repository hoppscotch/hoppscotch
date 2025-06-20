pub mod logger;
pub mod server;
pub mod updater;

use std::ops::Not;
use std::sync::OnceLock;

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let new_tab = MenuItemBuilder::with_id("new_tab", "New Tab")
                .accelerator("CmdOrCtrl+T")
                .build(app)
                .expect("Failed to build new tab menu item");

            let close_tab = MenuItemBuilder::with_id("close_tab", "Close Tab")
                .accelerator("CmdOrCtrl+W")
                .build(app)
                .expect("Failed to build close tab menu item");

            let reopen_tab = MenuItemBuilder::with_id("reopen_tab", "Reopen Closed Tab")
                .accelerator("CmdOrCtrl+Shift+T")
                .build(app)
                .expect("Failed to build reopen tab menu item");

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_tab)
                .item(&close_tab)
                .item(&reopen_tab)
                .build()
                .expect("Failed to build file menu");

            let focus_url = MenuItemBuilder::with_id("focus_url", "Focus Address Bar")
                .accelerator("CmdOrCtrl+L")
                .build(app)
                .expect("Failed to build focus URL menu item");

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&focus_url)
                .build()
                .expect("Failed to build view menu");

            let next_tab = MenuItemBuilder::with_id("next_tab", "Next Tab")
                .accelerator("CmdOrCtrl+Alt+Right")
                .build(app)
                .expect("Failed to build next tab menu item");

            let prev_tab = MenuItemBuilder::with_id("prev_tab", "Previous Tab")
                .accelerator("CmdOrCtrl+Alt+Left")
                .build(app)
                .expect("Failed to build previous tab menu item");

            let tab_first = MenuItemBuilder::with_id("tab_first", "Switch to First Tab")
                .accelerator("CmdOrCtrl+Alt+0")
                .build(app)
                .expect("Failed to build first tab menu item");

            let tab_last = MenuItemBuilder::with_id("tab_last", "Switch to Last Tab")
                .accelerator("CmdOrCtrl+Alt+9")
                .build(app)
                .expect("Failed to build last tab menu item");

            let tabs_menu = SubmenuBuilder::new(app, "Tabs")
                .item(&next_tab)
                .item(&prev_tab)
                .separator()
                .item(&tab_last)
                .build()
                .expect("Failed to build tabs menu");

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&view_menu)
                .item(&tabs_menu)
                .build()
                .expect("Failed to build menu");

            app.set_menu(menu).expect("Failed to set menu");

            let handle = app.handle().clone();
            app.on_menu_event(move |app, event| {
                let event_id = event.id().as_ref();
                let webview_windows = app.webview_windows();
                let perhaps_window = webview_windows
                    .iter()
                    // Any window that's not `main` since there can
                    // only be one window open at the moment.
                    //
                    // NOTE: Generally this should use `get_focused_window`
                    // but that requires `unstable` flag currently
                    // and causes arrow keys to insert escape sequences on MacOS
                    // see: https://github.com/hoppscotch/hoppscotch/pull/5108
                    .filter(|kv| kv.0.eq_ignore_ascii_case("main").not())
                    .last()
                    .map(|lw| lw.1);

                if let Some(window) = perhaps_window {
                    let shortcut_event = match event_id {
                        "new_tab" => {
                            tracing::info!("New Tab menu item triggered (CMD+T/Ctrl+T)");
                            Some("ctrl-t")
                        }
                        "close_tab" => {
                            tracing::info!("Close Tab menu item triggered (CMD+W/Ctrl+W)");
                            Some("ctrl-w")
                        }
                        "reopen_tab" => {
                            tracing::info!(
                                "Reopen Tab menu item triggered (CMD+Shift+T/Ctrl+Shift+T)"
                            );
                            Some("ctrl-shift-t")
                        }
                        "next_tab" => {
                            tracing::info!("Next Tab menu item triggered (CMD+Alt+Right/Ctrl+Alt+Right)");
                            Some("ctrl-alt-right")
                        }
                        "prev_tab" => {
                            tracing::info!(
                                "Previous Tab menu item triggered (CMD+Alt+Left/Ctrl+Alt+Left)"
                            );
                            Some("ctrl-alt-left")
                        }
                        "tab_last" => {
                            tracing::info!("Switch to Last Tab menu item triggered (CMD+9/Ctrl+9)");
                            Some("ctrl-9")
                        }
                        _ => None,
                    };

                    if let Some(shortcut) = shortcut_event {
                        window
                            .emit("hoppscotch_desktop_shortcut", shortcut)
                            .unwrap_or_else(|e| {
                                tracing::error!(
                                    error.message = %e,
                                    shortcut = shortcut,
                                    "Failed to emit shortcut event from menu"
                                );
                            });
                    }
                }
            });

            let server_port = portpicker::pick_unused_port().expect("Cannot find unused port");
            tracing::info!("Selected server port: {}", server_port);
            SERVER_PORT
                .set(server_port)
                .expect("Failed to set server port");
            let port = *SERVER_PORT.get().expect("Server port not initialized");
            tracing::info!(port = port, "Initializing server with pre-selected port");
            let port = server::init(port, handle.clone());
            tracing::info!(port = port, "Server initialization complete");

            tracing::info!(app_name = %app.package_info().name, "Configuring deep link handler");
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
            updater::install_updates_and_restart
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
