use axum::{
    routing::{get, post},
    Router,
};
use tauri::AppHandle;
use std::sync::Arc;

use crate::{controller, state::AppState};

pub fn route(
    state: Arc<AppState>,
    app_handle: AppHandle,
) -> Router {
    Router::new()
        .route("/handshake", get(controller::handshake))
        .route(
            "/receive-registration",
            post(controller::receive_registration::<AppHandle>),
        )
        .route(
            "/verify-registration",
            post(controller::verify_registration),
        )
        .route("/request", post(controller::run_request))
        .route("/cancel-request/:req_id", post(controller::cancel_request))
        .with_state((state, app_handle))
}
