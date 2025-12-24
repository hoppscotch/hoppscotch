use std::sync::Arc;

use tauri::{
    http::{Response, Uri},
    Config,
};

use super::error::Result;
use crate::cache::CacheManager;

pub struct UriHandler {
    cache: Arc<CacheManager>,
    config: Config,
}

impl UriHandler {
    pub fn new(cache: Arc<CacheManager>, config: Config) -> Self {
        Self { cache, config }
    }

    async fn fetch_content(&self, host: &str, path: &str) -> Result<Vec<u8>> {
        let file_path = if path.is_empty() { "index.html" } else { path };
        tracing::debug!(host = %host, path = %path, resolved_path = %file_path, "Fetching file content.");
        Ok(self.cache.get_file(host, file_path).await?)
    }

    fn determine_mime(path: &str) -> &str {
        if path.is_empty() || path == "index.html" {
            "text/html; charset=utf-8"
        } else {
            mime_guess::from_path(path)
                .first_raw()
                .unwrap_or("application/octet-stream")
        }
    }

    pub async fn handle(&self, uri: &Uri) -> Result<Response<Vec<u8>>> {
        let host = uri.host().unwrap_or_default();
        let path = uri.path().trim_start_matches('/');

        tracing::debug!(host = %host, path = %path, "Handling request");

        match self.fetch_content(host, path).await {
            Ok(content) => {
                tracing::info!(host = %host, path = %path, content_length = %content.len(), "Successfully retrieved file content");

                let mime_type = Self::determine_mime(path);
                let csp = match self.config.app.security.csp.as_ref() {
                    Some(csp) => {
                        tracing::debug!("Using configured CSP");
                        csp.to_string()
                    }
                    None => {
                        tracing::debug!("No CSP configured, using null");
                        String::from("null")
                    }
                };

                tracing::info!(
                    status = 200,
                    host = %host,
                    path = %path,
                    mime = %mime_type,
                    csp = %csp,
                    content_length = %content.len(),
                    "Building response"
                );

                let response = Response::builder()
                    .status(200)
                    .header("content-type", mime_type)
                    .header("content-security-policy", csp)
                    .header("access-control-allow-credentials", "true")
                    .header("x-content-type-options", "nosniff")
                    .body(content);

                tracing::info!("Sending response");

                response
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    host = %host,
                    path = %path,
                    "Failed to retrieve file content"
                );

                // Escape HTML special characters to prevent XSS
                let escape_html = |s: &str| -> String {
                    s.replace('&', "&amp;")
                        .replace('<', "&lt;")
                        .replace('>', "&gt;")
                        .replace('"', "&quot;")
                        .replace('\'', "&#39;")
                };

                let escaped_host = escape_html(host);
                let escaped_path = escape_html(if path.is_empty() { "index.html" } else { path });
                let escaped_error = escape_html(&e.to_string());

                // Return a user-friendly error page instead of an empty response
                // This prevents the white screen issue when cache lookup fails
                let error_html = format!(
                    r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Loading Error</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: #eee;
        }}
        .container {{
            text-align: center;
            padding: 40px;
        }}
        h1 {{ color: #ff6b6b; margin-bottom: 16px; }}
        p {{ color: #aaa; margin-bottom: 24px; }}
        button {{
            background: #4ecdc4;
            color: #1a1a2e;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }}
        button:hover {{ background: #45b7aa; }}
        .error-details {{
            margin-top: 20px;
            padding: 16px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            font-size: 12px;
            color: #888;
            word-break: break-all;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Failed to Load Content</h1>
        <p>The application encountered an error while loading. Please try restarting.</p>
        <button onclick="window.location.reload()">Reload</button>
        <div class="error-details">
            <strong>Technical Details:</strong><br>
            Host: {host}<br>
            Path: {path}<br>
            Error: {error}
        </div>
    </div>
</body>
</html>"#,
                    host = escaped_host,
                    path = escaped_path,
                    error = escaped_error
                );

                Response::builder()
                    .status(500)
                    .header("content-type", "text/html; charset=utf-8")
                    .body(error_html.into_bytes())
            }
        }
        .map_err(|e| {
            tracing::error!(
                error = %e,
                host = %host,
                path = %path,
                "Failed to build response"
            );
            e.into()
        })
    }
}
