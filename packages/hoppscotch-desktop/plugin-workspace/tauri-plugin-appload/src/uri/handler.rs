use std::sync::Arc;

use tauri::{
    http::{Response, Uri},
    Config,
};

use super::error::Result;
use crate::cache::CacheManager;
use crate::mapping::HostMapper;

pub struct UriHandler {
    cache: Arc<CacheManager>,
    mapper: Arc<HostMapper>,
    config: Config,
}

impl UriHandler {
    pub fn new(cache: Arc<CacheManager>, config: Config, mapper: Arc<HostMapper>) -> Self {
        Self {
            cache,
            config,
            mapper,
        }
    }

    async fn fetch_content(&self, host: &str, path: &str) -> Result<Vec<u8>> {
        let file_path = if path.is_empty() { "index.html" } else { path };
        let bundle_name = self.mapper.resolve(host);
        tracing::debug!(
            host = %host,
            bundle = %bundle_name,
            path = %path,
            resolved_path = %file_path,
            "Fetching file content."
        );
        Ok(self.cache.get_file(&bundle_name, file_path).await?)
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

        // Try to fetch the requested path. If it fails and the path looks
        // like a SPA route (no file extension), fall back to index.html so
        // the client-side router can handle it.
        let fetch_result = match self.fetch_content(host, path).await {
            Ok(content) => Ok((content, path)),
            Err(e) if !path.is_empty() && !path.contains('.') => {
                tracing::info!(
                    host = %host,
                    path = %path,
                    "Path not found and has no extension, falling back to index.html for SPA routing"
                );
                self.fetch_content(host, "")
                    .await
                    .map(|content| (content, ""))
                    .map_err(|_| e)
            }
            Err(e) => Err(e),
        };

        match fetch_result {
            Ok((content, resolved_path)) => {
                tracing::info!(host = %host, path = %path, content_length = %content.len(), "Successfully retrieved file content");

                let mime_type = Self::determine_mime(resolved_path);
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

                Response::builder().status(404).body(Vec::new())
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
