use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Bundle not found: {0}")]
    BundleNotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Storage full: required {required} bytes, available {available} bytes")]
    StorageFull { required: u64, available: u64 },

    #[error("Lock error: {0}")]
    LockError(String),

    #[error("Other error: {0}")]
    OtherError(String),
}

pub type Result<T> = std::result::Result<T, StorageError>;
