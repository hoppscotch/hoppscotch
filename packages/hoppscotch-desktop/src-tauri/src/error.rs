use std::io;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum HoppError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Failed to initialize server port")]
    ServerPortInitialization,

    #[error("Failed to emit event: {0}")]
    EventEmission(String),

    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),
}
