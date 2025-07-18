fn main() {
    #[cfg(feature = "portable")]
    {
        println!("cargo:rerun-if-changed=tauri.portable.conf.json");
        println!("cargo:rustc-env=TAURI_CONFIG_FILE=tauri.portable.conf.json");
    }

    #[cfg(not(feature = "portable"))]
    {
        println!("cargo:rerun-if-changed=tauri.conf.json");
    }

    tauri_build::build()
}
