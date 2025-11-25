// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use hoppscotch_agent_lib::{
    logger::{self, LogGuard},
    HOPPSCOTCH_AGENT_IDENTIFIER,
};

fn main() {
    // Follows how `tauri` does this and exactly matches desktop's approach
    // see: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/path/desktop.rs
    let path = {
        #[cfg(target_os = "macos")]
        let path =
            dirs::home_dir().map(|dir| dir.join("Library/Logs").join(HOPPSCOTCH_AGENT_IDENTIFIER));

        #[cfg(not(target_os = "macos"))]
        let path =
            dirs::data_local_dir().map(|dir| dir.join(HOPPSCOTCH_AGENT_IDENTIFIER).join("logs"));

        path
    };

    let Some(log_file_path) = path else {
        eprint!("Failed to setup logging!");

        println!("Starting Hoppscotch Agent...");

        return hoppscotch_agent_lib::run();
    };

    let Ok(LogGuard(guard)) = logger::setup(&log_file_path) else {
        eprint!("Failed to setup logging!");

        println!("Starting Hoppscotch Agent...");

        return hoppscotch_agent_lib::run();
    };

    // This keeps the guard alive, this is scoped to `main`
    // so it can only drop when the entire app exits,
    // so safe to have it like this.
    let _guard = guard;

    tracing::info!("Starting Hoppscotch Agent...");

    hoppscotch_agent_lib::run()
}
