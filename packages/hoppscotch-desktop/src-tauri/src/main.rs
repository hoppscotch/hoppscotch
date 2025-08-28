// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use hoppscotch_desktop_lib::{
    logger::{self, LogGuard},
    path,
};

fn main() {
    #[cfg(feature = "portable")]
    println!("Starting Hoppscotch Desktop in PORTABLE mode");

    #[cfg(not(feature = "portable"))]
    println!("Starting Hoppscotch Desktop in STANDARD mode");

    let log_dir = match path::logs_dir() {
        Ok(dir) => {
            println!("Log directory: {}", dir.display());
            dir
        }
        Err(e) => {
            eprintln!("Failed to setup logging directory: {}", e);
            println!("Starting Hoppscotch Desktop without logging...");
            return hoppscotch_desktop_lib::run();
        }
    };

    let Ok(LogGuard(guard)) = logger::setup(&log_dir) else {
        eprintln!("Failed to setup logging!");
        println!("Starting Hoppscotch Desktop without logging...");
        return hoppscotch_desktop_lib::run();
    };

    // This keeps the guard alive, this is scoped to `main`
    // so it can only drop when the entire app exits,
    // so safe to have it like this.
    let _guard = guard;

    #[cfg(feature = "portable")]
    {
        tracing::info!(
            "Hoppscotch Desktop v{} starting in PORTABLE mode",
            env!("CARGO_PKG_VERSION")
        );
        if let Ok(config_dir) = path::config_dir() {
            tracing::info!("Config directory (portable): {}", config_dir.display());
        }
        if let Ok(current_dir) = std::env::current_dir() {
            tracing::info!("Current working directory: {}", current_dir.display());
        }
    }

    #[cfg(not(feature = "portable"))]
    {
        tracing::info!(
            "Hoppscotch Desktop v{} starting in STANDARD mode",
            env!("CARGO_PKG_VERSION")
        );
        if let Ok(config_dir) = path::config_dir() {
            tracing::info!("Config directory (standard): {}", config_dir.display());
        }
    }

    hoppscotch_desktop_lib::run()
}
