use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreBuilder;
use tokio_util::sync::CancellationToken;
use tokio::sync::RwLock;

/// Describes one registered app instance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Registration {
  pub registered_at: DateTime<Utc>,
}

#[derive(Default)]
pub struct AppState {
    /// The active registration code that is being registered.
    pub active_registration_code: RwLock<Option<String>>,

    /// Cancellation Tokens for the running requests
    pub cancellation_tokens: DashMap<usize, CancellationToken>,

    /// Registrations against the agent, the key is the auth
    /// token associated to the registration
    registrations: DashMap<String, Registration>
}

impl AppState {

    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let mut store = StoreBuilder::new("app_data.bin")
            .build(app_handle);

        store.load()
            .expect("Loading from store failed for registrations update");

        // Try loading and parsing registrations from the store, if that failed,
        // load the default list
        let registrations = store.get("registrations")
          .and_then(|val| serde_json::from_value(val.clone()).ok())
          .unwrap_or_else(|| DashMap::new());


        Self {
            active_registration_code: RwLock::new(None),
            cancellation_tokens: DashMap::new(),
            registrations
        }
    }

    /// Gets you a readonly reference to the registrations list
    /// NOTE: Although DashMap API allows you to update the list from an immutable
    /// reference, you shouldn't do it for registrations as `update_registrations`
    /// performs save operation that needs to be done and should be used instead
    pub fn get_registrations(&self) -> &DashMap<String, Registration> {
      &self.registrations
    }

    /// Provides you an opportunity to update the registrations list
    /// and also persists the data to the disk
    pub fn update_registrations(
      &self,
      app_handle: tauri::AppHandle,
      update_func: impl FnOnce(&DashMap<String, Registration>)
    ) {

      update_func(&self.registrations);

      let mut store = StoreBuilder::new("app_data.bin")
          .build(app_handle);

      store.load()
        .expect("Loading the store failed for registrations update");

      store.delete("registrations")
        .expect("Failed clearing registrations for update");

      store.insert("registrations".into(), serde_json::to_value(self.registrations.clone()).unwrap())
        .expect("Failed setting registrations for update");

      store.save()
        .expect("Failed saving registrations to store for update");
    }

    pub async fn validate_registration(&self, registration: &str) -> bool {
        match *self.active_registration_code.read().await {
          Some(ref code) => code == registration,
          None => false
        }
    }

    pub fn remove_cancellation_token(&self, req_id: usize) -> Option<(usize, CancellationToken)> {
        self.cancellation_tokens.remove(&req_id)
    }

    pub fn add_cancellation_token(&self, req_id: usize, cancellation_tokens: CancellationToken) {
        self.cancellation_tokens.insert(req_id, cancellation_tokens);
    }

    pub fn validate_access(&self, auth_key: &str) -> bool {
      self.registrations.get(auth_key).is_some()
    }
}
