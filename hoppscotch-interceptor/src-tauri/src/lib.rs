mod controller;
mod model;
mod route;
mod server;
mod tray;

use model::AppState;
use tauri::{Manager, State};
use uuid::Uuid;

#[tauri::command]
async fn validate_otp(
    otp: String,
    expected_otp: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    todo!()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    let app_state = AppState::new();

    let (tx, rx) = tokio::sync::oneshot::channel();

    let server_app_state = app_state.clone();
    std::thread::spawn(move || {
        let runtime = tokio::runtime::Runtime::new().unwrap();
        runtime.block_on(async {
            server::run_server(server_app_state).await;
            let _ = tx.send(());
        });
    });

    let tauri_app_state = app_state.clone();
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .manage(tauri_app_state)
        .invoke_handler(tauri::generate_handler![validate_otp,])
        .setup(|app| {
            #[cfg(all(desktop))]
            {
                let handle = app.handle();
                tray::create_tray(handle)?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    let _ = rx.await;
}
