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
///
/// On web, org context comes from window.location.hostname (acme.hoppscotch.io), but on
/// desktop the webview URL is app://{bundle_name}/ which always returns the same hostname
/// regardless of which org the user is in. This mapper lets the same bundle files serve
/// under different virtual hostnames, so the JS can read window.location.hostname and get
/// the org context just like it does on web.
///
/// The inner Arc<DashMap> is necessary because HostMapper derives Clone. When the struct
/// gets cloned (happens when passed across thread boundaries), both instances need to share
/// the same underlying map. Without the Arc, each clone gets its own DashMap and mappings
/// registered in one wouldn't be visible in the other.
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
    /// If no mapping exists, returns the host unchanged (passthrough). This is how backward
    /// compatibility works: when loading without a host parameter, the bundle name itself
    /// becomes the host, and since there's no explicit mapping for it, resolve just returns
    /// it as-is. No special-casing needed.
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

    // Removes all mappings that point to a specific bundle. This gets called when a bundle
    // is removed via the `remove` command. Without this cleanup, you'd end up with orphaned
    // mappings where the virtual host still resolves to a bundle that no longer exists,
    // causing confusing 404s on the next load attempt.
    //
    // Iterates all mappings which is O(n), but n is small in practice (number of orgs the
    // user has loaded). Could add a reverse index if this ever becomes a problem.
    pub fn remove_mappings_for_bundle(&self, bundle_name: &str) {
        let hosts_to_remove: Vec<String> = self
            .mappings
            .iter()
            .filter(|entry| entry.value() == bundle_name)
            .map(|entry| entry.key().clone())
            .collect();

        for host in &hosts_to_remove {
            tracing::debug!(host = %host, bundle = %bundle_name, "Removing orphaned host mapping");
            self.mappings.remove(host);
        }

        if !hosts_to_remove.is_empty() {
            tracing::info!(
                count = hosts_to_remove.len(),
                bundle = %bundle_name,
                "Cleaned up host mappings for removed bundle"
            );
        }
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

    #[test]
    fn test_remove_mappings_for_bundle() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");
        mapper.register("beta_hoppscotch_io", "hoppscotch");
        mapper.register("gamma_other_io", "other_bundle");

        mapper.remove_mappings_for_bundle("hoppscotch");

        // Both hoppscotch mappings should be gone, falling back to passthrough
        assert!(!mapper.has_mapping("acme_hoppscotch_io"));
        assert!(!mapper.has_mapping("beta_hoppscotch_io"));
        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "acme_hoppscotch_io");
        assert_eq!(mapper.resolve("beta_hoppscotch_io"), "beta_hoppscotch_io");

        // other_bundle mapping should be untouched
        assert!(mapper.has_mapping("gamma_other_io"));
        assert_eq!(mapper.resolve("gamma_other_io"), "other_bundle");
    }

    #[test]
    fn test_remove_mappings_for_nonexistent_bundle() {
        let mapper = HostMapper::new();
        mapper.register("acme_hoppscotch_io", "hoppscotch");

        // Should be a no-op, not panic or error
        mapper.remove_mappings_for_bundle("nonexistent");

        // Original mapping should still be there
        assert!(mapper.has_mapping("acme_hoppscotch_io"));
        assert_eq!(mapper.resolve("acme_hoppscotch_io"), "hoppscotch");
    }
}
