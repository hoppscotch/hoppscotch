mod controller;
mod model;
mod route;
mod server;
mod tray;

use model::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            let server_state = app_state.clone();
            tauri::async_runtime::spawn(async move { server::run_server(server_state).await });

            Ok(())
        })
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![validate_otp])
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
}
