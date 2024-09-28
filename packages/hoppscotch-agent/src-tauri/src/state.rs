use chrono::{DateTime, Utc};
use dashmap::DashMap;
use tokio_util::sync::CancellationToken;
use tokio::sync::RwLock;

#[derive(Default)]
pub struct AppState {
    pub auth_tokens: DashMap<String, DateTime<Utc>>,

    /// The active registration code that is being registered.
    pub active_registration_code: RwLock<Option<String>>,

    /// Cancellation Tokens for the running requests
    pub cancellation_tokens: DashMap<usize, CancellationToken>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            auth_tokens: DashMap::new(),
            active_registration_code: RwLock::new(None),
            cancellation_tokens: DashMap::new(),
        }
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

    pub fn set_auth_token(&self, token: String) {
        self.auth_tokens.insert(token, Utc::now());
    }

    pub fn validate_auth_token(&self, token: &str) -> bool {
        self.auth_tokens.contains_key(token)
    }

    pub fn remove_auth_token(&self, token: &str) {
        self.auth_tokens.remove(token);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_token() {
        let state = AppState::new();
        let token = "test_token".to_string();
        state.set_auth_token(token.clone());
        assert!(state.validate_auth_token(&token));
        assert!(!state.validate_auth_token("invalid"));
    }

    #[test]
    fn test_cancellation_token() {
        let state = AppState::new();
        let req_id = 1;
        let token = CancellationToken::new();
        state.add_cancellation_token(req_id, token.clone());
        let removed = state.remove_cancellation_token(req_id);
        assert!(removed.is_some());
        assert_eq!(removed.unwrap().0, req_id);
    }
}
