// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "macos")]
#[macro_use]
extern crate cocoa;

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

#[cfg(target_os = "macos")]
mod mac;

#[cfg(target_os = "windows")]
mod windows;

use tauri::Manager;

fn main() {
    tauri_plugin_deep_link::prepare("io.hoppscotch.desktop");

    tauri::Builder::default()
        .setup(|app| {
            if cfg!(target_os = "macos") {
                use mac::window::setup_mac_window;

                setup_mac_window(app);
            } else if cfg!(target_os = "windows") {
                #[cfg(target_os = "windows")]
                setup_win_window(app);
            }

            let handle = app.handle();
            tauri_plugin_deep_link::register(
                "hoppscotch",
                move |request| {
                    println!("{:?}", request);                    
                    handle.emit_all("scheme-request-received", request).unwrap();
                },
            ).unwrap();

            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
