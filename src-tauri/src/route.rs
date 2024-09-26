use crate::{
    app_handle_ext::AppHandleExt,
    controller,
    model::{ConfirmedRegistrationRequest, RegistrationReceiveRequest, RequestDef},
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
        .allow_any_origin()
        .allow_headers(vec!["content-type", "authorization"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    let handshake = warp::get()
        .and(warp::path("handshake"))
        .and_then(controller::handshake);

    let receive_registration = warp::post()
        .and(warp::path("receive-registration"))
        .and(warp::body::json::<RegistrationReceiveRequest>())
        .and(state.clone())
        .and(app_handle.clone())
        .and_then(controller::receive_registration);

    let verify_registration = warp::post()
        .and(warp::path("verify-registration"))
        .and(warp::body::json::<ConfirmedRegistrationRequest>())
        .and(state.clone())
        .and(app_handle.clone())
        .and_then(controller::verify_registration);

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
        .or(receive_registration)
        .or(verify_registration)
        .or(request)
        .or(cancel_request)
        .with(cors)
}
