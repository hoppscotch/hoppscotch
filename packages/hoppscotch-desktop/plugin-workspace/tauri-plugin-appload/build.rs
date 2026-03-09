const COMMANDS: &[&str] = &["load", "download", "clear", "close", "remove"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
