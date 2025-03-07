// Copyright 2024 CuriousCorrelation
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

//! app bundle loading plugin for Tauri.
//! This plugin handles downloading and loading external web app bundles in Tauri webviews.

// TODO: Fix these. There are icons in the asset directory for the web app.
#![doc(
    html_logo_url = "https://github.com/<Placeholder>/<Placeholder>/raw/main/packages/app/public/favicon.ico",
    html_favicon_url = "https://github.com/<Placeholder>/<Placeholder>/raw/main/packages/app/public/favicon.ico"
)]

use std::sync::Arc;
use tauri::{
    plugin::{Builder, Plugin, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod api;
mod bundle;
mod cache;
mod commands;
mod config;
mod envvar;
mod error;
mod global;
mod models;
mod storage;
mod ui;
mod uri;
mod vendor;
mod verification;

pub use error::{Error, Result};
pub use vendor::{VendorConfig, VendorConfigBuilder};

#[cfg(mobile)]
use mobile::Appload;

const KERNEL_JS: &str = include_str!("kernel.js");

pub fn init<R: Runtime>(vendor: VendorConfigBuilder) -> TauriPlugin<R> {
    Builder::new("appload")
        .setup(move |app, api| {
            tracing::info!("Initializing appload plugin");

            tracing::debug!("Loading configuration settings.");
            let mut config = config::Config::default();

            tracing::debug!("Resolving app config directory for storage root.");
            let app_config_dir = app.path().app_config_dir().map_err(|e| {
                tracing::error!(error = %e, "Failed to resolve app config directory.");
                Error::Config(e.to_string())
            })?;

            tracing::info!(
                path = ?app_config_dir,
                "Setting storage root to app config directory."
            );
            config.storage.root_dir = app_config_dir;

            let storage = tauri::async_runtime::block_on(async {
                let storage = storage::StorageManager::new(config.storage.root_dir.clone())
                    .await
                    .map_err(|e| {
                        tracing::error!(error = %e, "Failed to initialize storage manager");
                        Error::Config(e.to_string())
                    })?;

                storage.init().await.map_err(|e| {
                    tracing::error!(error = %e, "Failed to initialize storage directories");
                    Error::Config(e.to_string())
                })?;

                Ok::<_, Error>(Arc::new(storage))
            })?;

            tracing::debug!("Setting up uri handler.");
            let tauri_config = app.config().clone();

            tracing::debug!("Initializing cache manager.");
            let cache = Arc::new(cache::CacheManager::new(
                storage.layout().cache_dir(),
                cache::CachePolicy::new(
                    config.cache.max_size,
                    config.cache.file_ttl,
                    config.cache.hot_ratio,
                ),
                tauri_config.clone(),
            ));

            tracing::debug!("Setting up bundle loader.");
            let bundle_loader = Arc::new(bundle::BundleLoader::new(cache.clone(), storage.clone()));

            let uri_handler = Arc::new(uri::UriHandler::new(cache.clone(), tauri_config.clone()));

            {
                let tauri_config = tauri_config.clone();
                let cache = cache.clone();
                let storage = storage.clone();
                tauri::async_runtime::block_on(async move {
                    match vendor.build() {
                        Ok(vendor) => {
                            if let Err(e) = vendor.initialize(tauri_config, cache, storage).await {
                                tracing::error!(error = %e, "Failed to initialize vendor.");
                            }
                        }
                        Err(e) => {
                            tracing::error!(error = %e, "Failed to build vendor.");
                        }
                    }
                });
            }

            #[cfg(desktop)]
            tracing::debug!("Initializing desktop-specific components.");
            #[cfg(desktop)]
            let view = desktop::init(app, api, bundle_loader.clone())?;

            #[cfg(mobile)]
            tracing::debug!("Initializing mobile-specific components.");
            #[cfg(mobile)]
            let view = mobile::init(app, api, bundle_loader.clone())?;

            app.manage(bundle_loader);
            app.manage(cache);
            app.manage(storage);
            app.manage(uri_handler);
            app.manage(view);

            tracing::info!("appload plugin setup complete.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::download,
            commands::load,
            commands::remove,
            commands::clear
        ])
        .register_uri_scheme_protocol("app", move |ctx, req| {
            tracing::info!("Incoming URI request");

            let app = ctx.app_handle();
            let uri = req.uri();

            tracing::debug!(
                url = %uri,
                thread_id = ?std::thread::current().id(),
                "Handling app URI scheme request."
            );

            let uri_handler = app.state::<Arc<uri::UriHandler>>();

            tracing::info!("Got URI handler");

            tauri::async_runtime::block_on(uri_handler.handle(uri)).unwrap()
        })
        .build()
}
