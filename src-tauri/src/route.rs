use crate::{
    app_handle_ext::AppHandleExt,
    controller,
    model::{ConfirmedOTPRequest, OTPReceiveRequest, RequestDef},
    state::AppState,
};
use std::sync::Arc;
use warp::Filter;

pub fn route<T: AppHandleExt + Clone + 'static>(
    state: Arc<AppState>,
    app_handle: T,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let state = warp::any().map(move || state.clone());
    let app_handle = warp::any().map(move || app_handle.clone());

    let cors = warp::cors()
        .allow_origin("http://localhost:1420")
        .allow_headers(vec!["content-type", "authorization"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    let handshake = warp::get()
        .and(warp::path("handshake"))
        .and_then(controller::handshake);

    let receive_otp = warp::post()
        .and(warp::path("receive-otp"))
        .and(warp::body::json::<OTPReceiveRequest>())
        .and(state.clone())
        .and(app_handle.clone())
        .and_then(controller::receive_otp);

    let verify_otp = warp::post()
        .and(warp::path("verify-otp"))
        .and(warp::body::json::<ConfirmedOTPRequest>())
        .and(state.clone())
        .and(app_handle.clone())
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
        .or(receive_otp)
        .or(verify_otp)
        .or(request)
        .or(cancel_request)
        .with(cors)
}
