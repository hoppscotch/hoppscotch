use crate::{show_main_window, state::AppState};
use lazy_static::lazy_static;
use std::sync::Arc;
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

const TRAY_ICON_DATA: &'static [u8] = include_bytes!("../icons/tray_icon.png");

lazy_static! {
    static ref TRAY_ICON: Image<'static> = Image::from_bytes(TRAY_ICON_DATA).unwrap();
}

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let clear_registrations = MenuItem::with_id(
        app,
        "clear_registrations",
        "Clear Registrations",
        true,
        None::<&str>,
    )?;
    let show_registrations = MenuItem::with_id(
        app,
        "show_registrations",
        "Show Registrations",
        true,
        None::<&str>,
    )?;

    let pkg_info = app.package_info();
    let app_name = pkg_info.name.clone();
    let app_version = pkg_info.version.clone();

    let app_name_item = MenuItem::with_id(app, "app_name", app_name, false, None::<&str>)?;
    let app_version_item = MenuItem::with_id(
        app,
        "app_version",
        format!("Version: {}", app_version),
        false,
        None::<&str>,
    )?;

    let menu = MenuBuilder::new(app)
        .item(&app_name_item)
        .item(&app_version_item)
        .separator()
        .item(&clear_registrations)
        .item(&show_registrations)
        .separator()
        .item(&quit_i)
        .build()?;

    let _ = TrayIconBuilder::with_id("hopp-tray")
        .tooltip("Hoppscotch Agent")
        .icon(if cfg!(target_os = "macos") {
            TRAY_ICON.clone()
        } else {
            app.default_window_icon().unwrap().clone()
        })
        .icon_as_template(cfg!(target_os = "macos"))
        .menu(&menu)
        .menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "quit" => {
                tracing::info!("Exiting the agent...");
                // Exit with a specific code to allow actual exit.
                app.exit(1);
            }
            "clear_registrations" => {
                let app_state = app.state::<Arc<AppState>>();

                app_state
                    .clear_registrations(app.clone())
                    .expect("Invariant violation: Failed to clear registrations");
            }
            "show_registrations" => {
                app.emit("show-registrations", ()).unwrap_or_else(|e| {
                    tracing::error!("Failed to emit show-registrations event: {}", e);
                });
                if let Err(e) = show_main_window(&app) {
                    tracing::error!("Failed to show window: {}", e);
                }
            }
            _ => {
                tracing::warn!("Unhandled menu event: {:?}", event.id);
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Err(e) = show_main_window(&app) {
                    tracing::error!("Failed to show window from tray: {}", e);
                }
            }
        })
        .build(app);

    Ok(())
}
