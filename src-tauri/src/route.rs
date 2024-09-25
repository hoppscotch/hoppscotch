use crate::{
    controller,
    model::{OTPRequest, RequestDef},
    state::AppState,
};
use std::sync::Arc;
use warp::Filter;

pub fn route(
    state: Arc<AppState>,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let state = warp::any().map(move || state.clone());

    let handshake = warp::get()
        .and(warp::path("handshake"))
        .and_then(controller::handshake);

    let get_otp = warp::get()
        .and(warp::path("otp"))
        .and(state.clone())
        .and_then(controller::get_otp);

    let verify_otp = warp::post()
        .and(warp::path("verify-otp"))
        .and(warp::body::json::<OTPRequest>())
        .and(state.clone())
        .and_then(controller::verify_otp);

    let request = warp::post()
        .and(warp::path("request"))
        .and(warp::body::json::<RequestDef>())
        .and(warp::header::<String>("Authorization"))
        .and(state.clone())
        .and_then(controller::run_request);

    let cancel_request = warp::post()
        .and(warp::path("cancel-request"))
        .and(warp::path::param::<usize>())
        .and(warp::header::<String>("Authorization"))
        .and(state.clone())
        .and_then(controller::cancel_request);

    handshake
        .or(get_otp)
        .or(verify_otp)
        .or(request)
        .or(cancel_request)
}
