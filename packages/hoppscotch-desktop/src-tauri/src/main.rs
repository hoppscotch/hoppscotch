// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    println!("Starting Hoppscotch Desktop application...");
    hoppscotch_desktop_lib::run()
}
