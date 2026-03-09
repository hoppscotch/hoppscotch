# Capabilities Configuration

## Why wildcards are used in default.json

The `default.json` capability configuration uses wildcards for windows, webviews, and remote URLs:

```json
{
  "windows": ["*"],
  "webviews": ["*"],
  "remote": {
    "urls": ["app://*"]
  }
}
```

### Rationale

**Cloud for Orgs Support**: The desktop app supports multi-tenancy where organizations get their own isolated contexts via dynamic hostnames. When a user switches to organization "acme", a new webview is created with URL `app://acme_hoppscotch_io/`. Since organization names are dynamic and user-defined, we cannot enumerate all possible window/webview labels or `app://` origins at build time.

**Security Considerations**:

1. **`app://` protocol is sandboxed**: The `app://` protocol is entirely handled by the tauri-plugin-appload plugin. External websites cannot inject content into this namespace. Only content served from the local bundle cache is accessible via `app://` URLs.

2. **No cross-origin access**: Each `app://` origin is isolated. A webview at `app://acme_hoppscotch_io/` cannot access content from `app://beta_hoppscotch_io/`.

3. **IPC commands are validated**: Tauri commands validate their inputs. The wildcard permission allows IPC calls from any `app://` origin, but the commands themselves enforce authorization.

**Alternatives Considered**:

- **Explicit patterns like `Hoppscotch-*`**: Tauri's capability system doesn't support glob patterns for window names in all contexts.
- **Pattern matching like `app://*_hoppscotch_io`**: Would require maintaining a list of allowed suffixes and wouldn't handle custom deployments.

### Previous Configuration

Before cloud-for-orgs support, the configuration used explicit window names:

```json
{
  "windows": ["main", "Hoppscotch-curr", "Hoppscotch-next"]
}
```

This was more restrictive but incompatible with dynamic organization subdomains.
