const COMMANDS: &[&str] = &["load", "download", "clear", "remove"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
