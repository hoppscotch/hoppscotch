use tauri::{AppHandle, Emitter, Runtime};

pub trait AppHandleExt: Send + Sync {
    fn emit(&self, event: &str, payload: impl serde::Serialize + Clone) -> tauri::Result<()>;
}

impl<R: Runtime> AppHandleExt for AppHandle<R> {
    fn emit(&self, event: &str, payload: impl serde::Serialize + Clone) -> tauri::Result<()> {
        Emitter::emit(self, event, payload)
    }
}

// Mock implementation for testing
#[derive(Clone)]
pub struct MockAppHandle;

impl AppHandleExt for MockAppHandle {
    fn emit(&self, _event: &str, _payload: impl serde::Serialize) -> tauri::Result<()> {
        Ok(())
    }
}
