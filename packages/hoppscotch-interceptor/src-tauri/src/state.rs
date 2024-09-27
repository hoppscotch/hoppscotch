use chrono::{DateTime, Utc};
use dashmap::DashMap;
use std::sync::RwLock;
use tokio_util::sync::CancellationToken;

#[derive(Default)]
pub struct AppState {
    pub auth_tokens: DashMap<String, DateTime<Utc>>,
    pub cancellation_tokens: DashMap<usize, CancellationToken>,
    pub current_registration: RwLock<Option<(String, DateTime<Utc>)>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            auth_tokens: DashMap::new(),
            cancellation_tokens: DashMap::new(),
            current_registration: RwLock::new(None),
        }
    }

    pub fn set_registration(&self, registration: String) {
        let created_at = Utc::now();
        let mut current_registration = self.current_registration.write().unwrap();
        *current_registration = Some((registration, created_at));
    }

    pub fn validate_registration(&self, registration: &str) -> bool {
        let current_registration = self.current_registration.read().unwrap();
        if let Some((stored_registration, _created_at)) = &*current_registration {
            *stored_registration == registration
        } else {
            false
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
