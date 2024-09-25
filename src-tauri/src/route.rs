use crate::{
    controller,
    model::{RegistrationKey, RequestDef},
    state::AppState,
};
use std::sync::Arc;
use warp::Filter;

pub fn route(
    state: Arc<AppState>,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let state = warp::any().map(move || state.clone());

    let request = warp::post()
        .and(warp::path("request"))
        .and(warp::body::json::<RequestDef>())
        .and(warp::header::<String>("Authorization"))
        .and(state.clone())
        .and_then(controller::run_request);

    // NOTE: Shouldn't registration be done by OTP and Tauri commands?
    // let registration_key = warp::get()
    //     .and(warp::path("request-registration-key"))
    //     .and(state.clone())
    //     .and_then(controller::get_registration_key);

    let auth_key = warp::post()
        .and(warp::path("request-auth-key"))
        .and(warp::body::json::<RegistrationKey>())
        .and(state.clone())
        .and_then(controller::get_auth_key);

    let cancel_request = warp::post()
        .and(warp::path("cancel-request"))
        .and(warp::path::param::<usize>())
        .and(warp::header::<String>("Authorization"))
        .and(state.clone())
        .and_then(controller::cancel_request);

    request
        // .or(registration_key)
        .or(auth_key)
        .or(cancel_request)
}
