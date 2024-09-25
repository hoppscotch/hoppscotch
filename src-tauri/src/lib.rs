mod controller;
mod model;
mod route;
mod server;
mod tray;

use std::sync::Arc;

use chrono::Utc;
use tauri::Manager;

use model::AppState;
use tokio_util::sync::CancellationToken;

#[tauri::command]
async fn validate_otp(
    otp: String,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, String> {
    let app_state = state.inner();
    let current_otp = app_state.current_otp.read().unwrap();
    if let Some((stored_otp, expiry)) = &*current_otp {
        if *stored_otp == otp && Utc::now() < *expiry {
            Ok("OTP validated successfully".to_string())
        } else {
            Err("Invalid or expired OTP".to_string())
        }
    } else {
        Err("No OTP generated".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

            std::thread::spawn(move || {
                tauri::async_runtime::block_on(async move {
                    server::run_server(server_state, server_cancellation_token).await;
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
        .invoke_handler(tauri::generate_handler![validate_otp])
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
