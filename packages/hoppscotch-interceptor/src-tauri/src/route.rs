use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;

use crate::{app_handle_ext::AppHandleExt, controller, state::AppState};

pub fn route<T: AppHandleExt + Clone + Send + Sync + 'static>(
    state: Arc<AppState>,
    app_handle: T,
) -> Router {
    Router::new()
        .route("/handshake", get(controller::handshake))
        .route(
            "/receive-registration",
            post(controller::receive_registration::<T>),
        )
        .route(
            "/verify-registration",
            post(controller::verify_registration::<T>),
        )
        .route("/request", post(controller::run_request))
        .route("/cancel-request/:req_id", post(controller::cancel_request))
        .with_state((state, app_handle))
}
