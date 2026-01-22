use dashmap::DashMap;
use std::sync::Arc;

/// Maps virtual hosts to bundle names.
///
/// This enables a single bundle to be served under multiple virtual hosts,
/// which is essential for cloud-for-orgs support where the same Hoppscotch
/// bundle needs to appear as different organization subdomains.
///
/// Example:
/// - `load({ bundleName: "Hoppscotch", host: "acme.hoppscotch.io" })`
/// - Registers mapping: "acme_hoppscotch_io" -> "hoppscotch"
/// - Webview URL becomes: `app://acme_hoppscotch_io/`
/// - UriHandler resolves "acme_hoppscotch_io" -> "hoppscotch" for file lookups
#[derive(Debug, Clone, Default)]
pub struct HostMapper {
    mappings: Arc<DashMap<String, String>>,
}

impl HostMapper {
    pub fn new() -> Self {
        Self {
            mappings: Arc::new(DashMap::new()),
        }
    }

    /// Register a host-to-bundle mapping.
    ///
    /// # Arguments
    /// * `host` - The virtual host (e.g., "acme_hoppscotch_io")
    /// * `bundle_name` - The actual bundle name (e.g., "hoppscotch")
    pub fn register(&self, host: &str, bundle_name: &str) {
        tracing::debug!(host = %host, bundle = %bundle_name, "Registering host to bundle mapping");
        self.mappings
            .insert(host.to_string(), bundle_name.to_string());
    }

    /// Resolve a host to its bundle name.
    ///
    /// If no mapping exists, returns the host itself (passthrough behavior).
    ///
    /// # Arguments
    /// * `host` - The virtual host to resolve
    ///
    /// # Returns
    /// The bundle name if a mapping exists, otherwise the host unchanged.
    pub fn resolve(&self, host: &str) -> String {
        let resolved = self
            .mappings
            .get(host)
            .map(|v| v.clone())
            .unwrap_or_else(|| host.to_string());

        tracing::debug!(host = %host, resolved = %resolved, "Resolved host mapping");
        resolved
    }

    /// Remove a host mapping.
    ///
    /// # Arguments
    /// * `host` - The virtual host to unregister
    pub fn unregister(&self, host: &str) {
        tracing::debug!(host = %host, "Unregistering host mapping");
        self.mappings.remove(host);
    }

    pub fn has_mapping(&self, host: &str) -> bool {
        self.mappings.contains_key(host)
    }

    pub fn clear(&self) {
        tracing::debug!("Clearing all host mappings");
        self.mappings.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_and_resolve() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");

        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "hoppscotch");
    }

    #[test]
    fn test_resolve_passthrough() {
        let mapper = HostMapper::new();

        assert_eq!(mapper.resolve("hoppscotch"), "hoppscotch");
    }

    #[test]
    fn test_unregister() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");
        mapper.unregister("acme_hoppscotch_io");

        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "acme_hoppscotch_io");
    }

    #[test]
    fn test_has_mapping() {
        let mapper = HostMapper::new();
        assert!(!mapper.has_mapping("acme_hoppscotch_io"));

        mapper.register("acme_hoppscotch_io", "hoppscotch");
        assert!(mapper.has_mapping("acme_hoppscotch_io"));
    }

    #[test]
    fn test_empty_host_passthrough() {
        let mapper = HostMapper::new();
        assert_eq!(mapper.resolve(""), "");
    }

    #[test]
    fn test_case_sensitivity() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");

        assert_eq!(mapper.resolve("ACME_HOPPSCOTCH_IO"), "ACME_HOPPSCOTCH_IO");
        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "hoppscotch");
    }

    #[test]
    fn test_overwrite_mapping() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");
        mapper.register("acme_hoppscotch_io", "different_bundle");

        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "different_bundle");
    }

    #[test]
    fn test_clear() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");
        mapper.register("beta_hoppscotch_io", "hoppscotch");
        mapper.clear();

        assert!(!mapper.has_mapping("acme_hoppscotch_io"));
        assert!(!mapper.has_mapping("beta_hoppscotch_io"));
        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "acme_hoppscotch_io");
    }

    #[test]
    fn test_multiple_hosts_same_bundle() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");
        mapper.register("beta_hoppscotch_io", "hoppscotch");
        mapper.register("gamma_hoppscotch_io", "hoppscotch");

        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "hoppscotch");
        assert_eq!(mapper.resolve("beta_hoppscotch_io"), "hoppscotch");
        assert_eq!(mapper.resolve("gamma_hoppscotch_io"), "hoppscotch");
    }

    #[test]
    fn test_long_host_name() {
        let mapper = HostMapper::new();
        let long_host = "a".repeat(253); // DNS max length
        mapper.register(&long_host, "hoppscotch");

        assert_eq!(mapper.resolve(&long_host), "hoppscotch");
    }
}
