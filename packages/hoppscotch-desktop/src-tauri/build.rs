// Every command in `generate_handler!` in `src/lib.rs`, so each gets an
// `allow-` permission that `capabilities/default.json` grants. On Windows
// a bundle window is served from `http://app.<bundle>/`, which Tauri
// treats as a remote origin, and a remote origin reaches an app command
// only through a permission declared in this manifest.
const APP_COMMANDS: &[&str] = &[
    "is_portable",
    "hopp_auth_port",
    "quit_app",
    "check_and_backup_on_version_change",
    "set_desktop_config",
    "check_for_updates",
    "download_and_install_update",
    "restart_application",
    "cancel_update",
    "get_download_progress",
    "is_portable_mode",
    "get_config_dir",
    "get_latest_dir",
    "get_instance_dir",
    "get_store_dir",
    "get_backup_dir",
    "get_logs_dir",
    "append_log",
    "read_log",
    "get_appload_registry",
];

fn main() {
    #[cfg(all(feature = "portable", target_os = "windows"))]
    {
        println!("cargo:rerun-if-changed=tauri.portable.windows.conf.json");
        println!("cargo:rustc-env=TAURI_CONFIG_FILE=tauri.portable.windows.conf.json");
    }

    #[cfg(all(feature = "portable", target_os = "macos"))]
    {
        println!("cargo:rerun-if-changed=tauri.portable.macos.conf.json");
        println!("cargo:rustc-env=TAURI_CONFIG_FILE=tauri.portable.macos.conf.json");
    }

    #[cfg(not(feature = "portable"))]
    {
        println!("cargo:rerun-if-changed=tauri.conf.json");
    }

    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(APP_COMMANDS)),
    )
    .expect("failed to run tauri-build")
}
