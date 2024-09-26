pub mod app_handle_ext;
pub mod controller;
pub mod interceptor;
pub mod model;
pub mod route;
pub mod server;
pub mod state;
pub mod tray;
pub mod util;

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

            let server_app_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                server::run_server(server_state, server_cancellation_token, server_app_handle)
                    .await;
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
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state: tauri::State<CancellationToken> = window.state();
                state.cancel();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                let state = app_handle.state::<CancellationToken>();
                state.cancel();
                api.prevent_exit();
            }
            _ => {}
        });
}
