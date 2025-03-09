const COMMANDS: &[&str] = &["execute", "cancel", "subscribe"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
