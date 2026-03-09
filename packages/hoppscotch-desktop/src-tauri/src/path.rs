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

pub fn latest_dir() -> io::Result<PathBuf> {
    let path = config_dir()?.join("latest");
    std::fs::create_dir_all(&path)?;
    Ok(path)
}

pub fn instance_dir() -> io::Result<PathBuf> {
    let path = latest_dir()?.join("instance");
    std::fs::create_dir_all(&path)?;
    Ok(path)
}

pub fn store_dir() -> io::Result<PathBuf> {
    let path = latest_dir()?.join("store");
    std::fs::create_dir_all(&path)?;
    Ok(path)
}

pub fn get_versioned_backup_dir(version: &str) -> io::Result<PathBuf> {
    let backup_root = backup_dir()?;
    let versioned_path = backup_root.join(format!("v{}", version));
    std::fs::create_dir_all(&versioned_path)?;
    Ok(versioned_path)
}

pub fn backup_dir() -> io::Result<PathBuf> {
    let path = config_dir()?.join("backup");
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
pub fn get_latest_dir() -> Result<String, String> {
    latest_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_instance_dir() -> Result<String, String> {
    instance_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_store_dir() -> Result<String, String> {
    store_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_backup_dir() -> Result<String, String> {
    backup_dir()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_id_constant() {
        assert_eq!(APP_ID, "io.hoppscotch.desktop");
    }

    #[test]
    fn test_log_file_path() {
        let path = log_file_path();
        assert!(path.to_string_lossy().contains("io.hoppscotch.desktop.log"));
    }

    #[test]
    fn test_manifest_path_portable() {
        let path = manifest_path();
        assert!(path.to_string_lossy().ends_with("hopp_manifest.json"));
    }

    #[test]
    fn test_platform_config_dir_structure() {
        let config_dir = platform_config_dir();

        #[cfg(feature = "portable")]
        {
            assert!(config_dir
                .to_string_lossy()
                .contains("hoppscotch-desktop-data"));
        }

        #[cfg(not(feature = "portable"))]
        {
            assert!(config_dir.to_string_lossy().contains(APP_ID));
        }
    }

    #[test]
    fn test_platform_logs_dir_structure() {
        let logs_dir = platform_logs_dir();

        #[cfg(feature = "portable")]
        {
            assert!(logs_dir.to_string_lossy().ends_with("logs"));
        }

        #[cfg(not(feature = "portable"))]
        {
            assert!(logs_dir.to_string_lossy().contains(APP_ID));
        }
    }

    #[test]
    fn test_get_config_dir_command() {
        let result = get_config_dir();
        assert!(result.is_ok());
        let path_str = result.unwrap();
        assert!(!path_str.is_empty());
    }

    #[test]
    fn test_get_logs_dir_command() {
        let result = get_logs_dir();
        assert!(result.is_ok());
        let path_str = result.unwrap();
        assert!(!path_str.is_empty());
    }
}

#[cfg(test)]
mod portable_tests {
    // NOTE: These tests should only run when
    // the portable feature flag is enabled
    #[cfg(feature = "portable")]
    #[test]
    fn test_portable_bundle_path() {
        let path = bundle_path();
        assert!(path.file_name().unwrap() == "hopp_bundle.zip");
    }

    #[cfg(feature = "portable")]
    #[test]
    fn test_portable_manifest_path() {
        let path = manifest_path();
        assert!(path.file_name().unwrap() == "hopp_manifest.json");
    }

    #[cfg(feature = "portable")]
    #[test]
    fn test_portable_config_dir_structure() {
        let config_dir = platform_config_dir();
        assert!(config_dir
            .to_string_lossy()
            .contains("hoppscotch-desktop-data"));
    }
}

#[cfg(test)]
mod platform_tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn test_macos_paths() {
        let config_dir = platform_config_dir();
        if !cfg!(feature = "portable") {
            assert!(config_dir
                .to_string_lossy()
                .contains("Library/Application Support"));
        }

        let logs_dir = platform_logs_dir();
        if !cfg!(feature = "portable") {
            assert!(logs_dir.to_string_lossy().contains("Library/Logs"));
        }
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_paths() {
        let config_dir = platform_config_dir();
        if !cfg!(feature = "portable") {
            assert!(config_dir.to_string_lossy().contains(APP_ID));
        }
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_linux_paths() {
        let config_dir = platform_config_dir();
        if !cfg!(feature = "portable") {
            assert!(config_dir.to_string_lossy().contains(APP_ID));
        }
    }
}
