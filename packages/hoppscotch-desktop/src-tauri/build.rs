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

    tauri_build::build()
}
