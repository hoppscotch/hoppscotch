use log::{error, info};
use tauri::{Manager, Runtime, Window};

use super::error::{StartupError, StartupResult, WindowNotFoundError};
/// Shows the `main` labeled application window.
///
/// This function is designed to be called as a Tauri command.
///
/// # Arguments
///
/// * `window` - A `Window` instance representing the current window. This is automatically
///              provided by Tauri when the command is invoked.
///
/// # Returns
///
/// Returns a `StartupResult<(), String>`:
/// - `Ok(())` if showing main window operation succeed.
/// - `Err(StartupError)` containing an error message if any operation fails.
///
/// # Errors
///
/// This function will return an error if:
/// - The "main" window is not found.
/// - Showing the main window fails.
///
/// # Example
///
/// ```rust,no_run
/// #[tauri::command]
/// async fn invoke_interop_startup_init(window: tauri::Window) {
///     match interop_startup_init(window).await {
///         Ok(_) => println!("`main` window shown successfully"),
///         Err(e) => eprintln!("Error: {}", e),
///     }
/// }
/// ```
#[tauri::command]
pub async fn interop_startup_init<R: Runtime>(window: Window<R>) -> StartupResult<()> {
    let main_window = window.get_window("main").ok_or_else(|| {
        error!("No window labeled 'main' found");
        StartupError::WindowNotFound(WindowNotFoundError::Main)
    })?;

    main_window.show().map_err(|e| {
        error!("Failed to show `main` window: {}", e);
        StartupError::Tauri(format!("Failed to show `main` window: {}", e))
    })?;

    info!("`main` window shown successfully");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tauri::test::{assert_ipc_response, mock_builder, mock_context, noop_assets};
    use tauri::{InvokePayload, WindowBuilder, WindowUrl};

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .invoke_handler(tauri::generate_handler![interop_startup_init])
            .build(mock_context(noop_assets()))
            .expect("failed to build mock app")
    }

    /// Test: Main window shown successfully in isolation
    ///
    /// Rationale:
    /// This test verifies the core functionality of `interop_startup_init`.
    /// A failure indicates a fundamental issue with the app's initialization process.
    ///
    /// Context:
    /// The "main" window is typically the primary interface,
    /// so ensuring it shows correctly is important.
    ///
    /// Key Points:
    /// - We use a mock Tauri application to isolate the window showing behavior.
    /// - The test focuses solely on the "main" window to verify the basic case works correctly.
    ///
    /// Assumptions:
    /// - The Tauri runtime is functioning correctly.
    /// - A window labeled "main" exists in the application.
    ///   For this see `tauri.conf.json`:
    /// ```json
    /// {
    ///   ...
    ///   "label": "main",
    ///   "title": "Hoppscotch",
    ///   ...
    ///   ...
    /// }
    /// ```
    ///
    /// Implications of Failure:
    /// 1. The window labeling system is broken.
    /// 2. There's an issue with Tauri's window management.
    /// 3. The `interop_startup_init` function is not correctly implemented.
    #[tokio::test]
    async fn test_interop_startup_init_main_window_shown_successfully() {
        let app = create_app(mock_builder());

        let window = app.get_window("main").expect("`main` window not found");

        let result = interop_startup_init(window).await;

        assert!(result.is_ok(), "Expected Ok, but got {:?}", result);
    }

    /// Test: Main window found and shown amongst other windows
    ///
    /// Rationale:
    /// This test ensures `interop_startup_init` can correctly identify and show the main window
    /// in a more complex scenario with multiple windows.
    ///
    /// Context:
    /// As applications grow, they may introduce additional windows for various purposes. The ability
    /// to consistently identify and manipulate the main window is important for maintaining
    /// expected behavior.
    ///
    /// Key Points:
    /// - We create an additional "other" window to simulate another window.
    /// - The test verifies that the presence of other windows doesn't interfere with main window operations.
    ///
    /// Assumptions:
    /// - The window labeling system consistently identifies the "main" window regardless of other windows.
    /// - The order of window creation doesn't affect the ability to find the main window.
    ///
    /// Implications of Failure:
    /// 1. The window identification logic breaks with multiple windows.
    #[tokio::test]
    async fn test_interop_startup_init_main_window_found_amongst_others() {
        let app = create_app(mock_builder());

        let _ = WindowBuilder::new(&app, "other", WindowUrl::default())
            .build()
            .expect("Failed to create other window");

        let window = app.get_window("other").expect("`other` window not found");

        let result = interop_startup_init(window).await;

        assert!(result.is_ok(), "Expected `Ok(())`, but got {:?}", result);
    }

    /// Test: IPC invocation of interop startup init
    ///
    /// Rationale:
    /// This test makes sure that `interop_startup_init` can be correctly invoked through Tauri's IPC mechanism.
    /// It's important because it verifies the integration between the Rust backend and the frontend
    /// that would typically call this function.
    ///
    /// Context:
    /// This test simulates scenarios where operations are initiated from the frontend via IPC calls.
    ///
    /// Key Points:
    /// - We're testing the IPC invocation, not just the direct function call.
    /// - This verifies both the function's behavior and its correct registration with Tauri's IPC system.
    ///
    /// Assumptions:
    /// - The Tauri IPC system is functioning correctly.
    /// - The `interop_startup_init` function is properly registered as a Tauri command.
    ///
    /// Implications of Failure:
    /// 1. There's a mismatch between how the frontend tries to call the function and how it's implemented.
    /// 2. The Tauri command registration is incorrect.
    /// 3. The function isn't properly handling the IPC context.
    #[tokio::test]
    async fn test_ipc_interop_startup_init() {
        let app = create_app(mock_builder());

        let window = app.get_window("main").expect("main window not found");

        let payload = InvokePayload {
            cmd: "interop_startup_init".into(),
            tauri_module: None,
            callback: tauri::api::ipc::CallbackFn(0),
            error: tauri::api::ipc::CallbackFn(1),
            inner: json!(null),
            invoke_key: Some("__invoke-key__".to_string()),
        };

        assert_ipc_response(&window, payload, Ok(()));
    }
}
