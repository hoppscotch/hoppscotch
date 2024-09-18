/// Error handling module for startup-related operations.
///
/// This module defines custom error types and a result type used for startup process of the app.
/// Essentially provides a way to handle and communicate errors
/// that may occur during the initialization and window management phases.
use serde::Serialize;
use thiserror::Error;

/// Represents errors related to window lookup failures.
///
/// Provide more specific information about which window that could not be found.
///
/// Derives `Serialize` mainly for sending it over to the frontend for info/logging purposes.
#[derive(Debug, Error, Serialize)]
pub(crate) enum WindowNotFoundError {
    /// Indicates that the `main` window of the app could not be found.
    ///
    /// This typically occurs if there's a mismatch between the expected
    /// window labels and the actual windows created by the application.
    #[error("No window labeled 'main' found")]
    Main,
}

/// Represents errors that can occur during the startup process.
///
/// Derives `Serialize` mainly for sending it over to the frontend for info/logging purposes.
#[derive(Debug, Error, Serialize)]
pub(crate) enum StartupError {
    /// Represents errors related to window lookup failures.
    #[error("Window not found: {0}")]
    WindowNotFound(WindowNotFoundError),

    /// Represents a general error from the Tauri runtime.
    ///
    /// This variant is used for any errors originating from Tauri that don't
    /// fit into more specific categories.
    #[error("Tauri error: {0}")]
    Tauri(String),
}

/// Functions that are part of the startup process should return this result type.
/// This allows for consistent error handling and makes it clear that the function
/// is part of the startup flow.
///
/// ```
/// use your_crate::error::{StartupResult, StartupError};
///
/// fn some_startup_function() -> StartupResult<()> {
///     // Function implementation
///     Ok(())
/// }
/// ```
pub(crate) type StartupResult<T> = std::result::Result<T, StartupError>;
