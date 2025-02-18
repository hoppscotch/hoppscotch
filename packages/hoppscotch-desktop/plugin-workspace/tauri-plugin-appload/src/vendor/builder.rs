use crate::Manifest;

use super::{Result, VendorConfig, VendorError};

#[derive(Default)]
pub struct VendorConfigBuilder {
    bundle: Option<(Vec<u8>, Vec<u8>)>,
}

impl VendorConfigBuilder {
    pub fn new() -> Self {
        Self { bundle: None }
    }

    pub fn bundle(mut self, bundle_bytes: Vec<u8>, manifest_bytes: &[u8]) -> Self {
        self.bundle = Some((bundle_bytes, manifest_bytes.to_vec()));
        self
    }

    pub fn build(self) -> Result<VendorConfig> {
        let bundle = self
            .bundle
            .map(|(bundle_bytes, manifest_bytes)| -> Result<_> {
                let manifest: Manifest = serde_json::from_slice(&manifest_bytes).map_err(|e| {
                    VendorError::InvalidData(format!("Invalid manifest JSON: {}", e))
                })?;

                Ok((bundle_bytes, manifest))
            })
            .transpose()?;

        Ok(VendorConfig { bundle })
    }
}
