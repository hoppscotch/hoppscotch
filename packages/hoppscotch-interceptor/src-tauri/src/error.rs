use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Invalid or expired Registration")]
    InvalidRegistration,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Request not found or already completed")]
    RequestNotFound,
    #[error("Internal server error")]
    InternalServerError,
    #[error("Invalid request: {0}")]
    BadRequest(String),
    #[error("Client certificate error")]
    ClientCertError,
    #[error("Root certificate error")]
    RootCertError,
    #[error("Invalid method")]
    InvalidMethod,
    #[error("Invalid URL")]
    InvalidUrl,
    #[error("Invalid headers")]
    InvalidHeaders,
    #[error("Request run error: {0}")]
    RequestRunError(String),
    #[error("Request cancelled")]
    RequestCancelled,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::InvalidRegistration => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::RequestNotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::InternalServerError => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::ClientCertError => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::RootCertError => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::InvalidMethod => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::InvalidUrl => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::InvalidHeaders => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::RequestRunError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::RequestCancelled => (StatusCode::BAD_REQUEST, self.to_string()),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

pub type AppResult<T> = std::result::Result<T, AppError>;
