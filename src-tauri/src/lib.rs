pub mod controller;
pub mod model;
pub mod route;
pub mod server;
pub mod state;
pub mod tray;
pub mod app_handle_ext;

use state::AppState;
use std::sync::Arc;
use tauri::Manager;
use tokio_util::sync::CancellationToken;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let app_state = Arc::new(AppState::new());
    let server_state = app_state.clone();
    let cancellation_token = CancellationToken::new();
    let server_cancellation_token = cancellation_token.clone();

    tauri::Builder::default()
        .setup(move |app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            let server_state = server_state.clone();
            let server_cancellation_token = server_cancellation_token.clone();
            let app_handle = app.handle();

            let app_handle = app_handle.clone();
            std::thread::spawn(move || {
                tauri::async_runtime::block_on(async move {
                    server::run_server(server_state, server_cancellation_token, app_handle).await;
                });
            });

            #[cfg(all(desktop))]
            {
                let handle = app.handle();
                tray::create_tray(handle)?;
            }

            Ok(())
        })
        .manage(app_state)
        .manage(cancellation_token)
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state: tauri::State<CancellationToken> = window.state();
                state.cancel();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
