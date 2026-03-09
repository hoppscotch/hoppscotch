use std::path::PathBuf;

use file_rotate::{compression::Compression, suffix::AppendCount, ContentLimit, FileRotate};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::HOPPSCOTCH_AGENT_IDENTIFIER;

pub struct LogGuard(pub tracing_appender::non_blocking::WorkerGuard);

pub fn setup(log_dir: &PathBuf) -> Result<LogGuard, Box<dyn std::error::Error>> {
    std::fs::create_dir_all(log_dir)?;

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| "debug".into());

    let log_file_path = log_dir.join(&format!("{}.log", HOPPSCOTCH_AGENT_IDENTIFIER));
    tracing::info!(log_file_path =? &log_file_path);

    let file = FileRotate::new(
        &log_file_path,
        AppendCount::new(5),
        ContentLimit::Bytes(10 * 1024 * 1024),
        Compression::None,
        None,
    );

    let (non_blocking, guard) = tracing_appender::non_blocking(file);

    let console_layer = fmt::layer()
        .with_writer(std::io::stdout)
        .with_thread_ids(true)
        .with_thread_names(true)
        .with_ansi(!cfg!(target_os = "windows"));

    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .with_ansi(false)
        .with_thread_ids(true)
        .with_thread_names(true)
        .with_timer(tracing_subscriber::fmt::time::UtcTime::rfc_3339());

    tracing_subscriber::registry()
        .with(env_filter)
        .with(file_layer)
        .with(console_layer)
        .init();

    tracing::info!(
        log_file = %log_file_path.display(),
        "Logging initialized with rotating file"
    );

    Ok(LogGuard(guard))
}
