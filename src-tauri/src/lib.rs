mod controller;
mod model;
mod route;
mod server;
mod tray;

use std::sync::Arc;

use chrono::{Duration, Utc};
use rand::Rng;
use tauri::Manager;

use model::AppState;
use tokio_util::sync::CancellationToken;

#[tauri::command]
async fn generate_otp(state: tauri::State<'_, Arc<AppState>>) -> Result<String, String> {
    let otp: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(6)
        .map(char::from)
        .collect();

    let expiry = Utc::now() + Duration::minutes(5);
    state.set_otp(otp.clone(), expiry);

    Ok(otp)
}

#[tauri::command]
async fn validate_otp(
    otp: String,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<String, String> {
    if state.validate_otp(&otp) {
        let auth_token: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();
        let token_expiry = Utc::now() + Duration::hours(1);
        state.set_auth_token(auth_token.clone(), token_expiry);
        Ok(auth_token)
    } else {
        Err("Invalid or expired OTP".to_string())
    }
}

#[tauri::command]
async fn revoke_auth_token(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    state.clear_auth_token();
    Ok(())
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
        .invoke_handler(tauri::generate_handler![generate_otp, validate_otp])
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
