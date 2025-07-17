use std::io;
use std::path::PathBuf;

/// App identifier (identical to `tauri.conf.json`)
/// used for various directories and configurations
pub const APP_ID: &str = "io.hoppscotch.desktop";

pub fn config_dir() -> io::Result<PathBuf> {
    let path = platform_config_dir();
    std::fs::create_dir_all(&path)?;
    Ok(path)
}

pub fn logs_dir() -> io::Result<PathBuf> {
    let path = platform_logs_dir();
    std::fs::create_dir_all(&path)?;
    Ok(path)
}

#[tauri::command]
pub fn get_config_dir() -> Result<String, String> {
    config_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_logs_dir() -> Result<String, String> {
    logs_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|err| err.to_string())
}

pub fn log_file_path() -> PathBuf {
    platform_logs_dir().join(format!("{}.log", APP_ID))
}

pub fn bundle_path() -> PathBuf {
    if cfg!(feature = "portable") {
        std::env::current_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("hopp_bundle.zip")
    } else {
        std::env::temp_dir().join("hopp_bundle.zip")
    }
}

pub fn manifest_path() -> PathBuf {
    if cfg!(feature = "portable") {
        std::env::current_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("hopp_manifest.json")
    } else {
        std::env::temp_dir().join("hopp_manifest.json")
    }
}

// Follows how `tauri` does this
// see: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/path/desktop.rs
fn platform_config_dir() -> PathBuf {
    if cfg!(feature = "portable") {
        return std::env::current_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("hoppscotch-desktop-data");
    }

    #[cfg(target_os = "macos")]
    {
        dirs::home_dir()
            .map(|dir| dir.join("Library/Application Support").join(APP_ID))
            .unwrap_or_else(|| std::env::temp_dir().join(APP_ID))
    }

    #[cfg(target_os = "windows")]
    {
        dirs::config_dir()
            .map(|dir| dir.join(APP_ID))
            .unwrap_or_else(|| std::env::temp_dir().join(APP_ID))
    }

    #[cfg(target_os = "linux")]
    {
        dirs::config_dir()
            .map(|dir| dir.join(APP_ID))
            .unwrap_or_else(|| std::env::temp_dir().join(APP_ID))
    }

    // Fallback for others
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        std::env::temp_dir().join(APP_ID)
    }
}

// Follows how `tauri` does this
// see: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/path/desktop.rs
fn platform_logs_dir() -> PathBuf {
    if cfg!(feature = "portable") {
        return std::env::current_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("logs");
    }

    #[cfg(target_os = "macos")]
    {
        dirs::home_dir()
            .map(|dir| dir.join("Library/Logs").join(APP_ID))
            .unwrap_or_else(|| std::env::temp_dir().join(APP_ID).join("logs"))
    }

    // Also fallback for others
    #[cfg(not(target_os = "macos"))]
    {
        dirs::data_local_dir()
            .map(|dir| dir.join(APP_ID).join("logs"))
            .unwrap_or_else(|| std::env::temp_dir().join(APP_ID).join("logs"))
    }
}
