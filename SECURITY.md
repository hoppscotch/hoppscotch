# Security Policy

- [Security Policy](#security-policy)
  - [Scope](#scope)
  - [Architecture and threat model](#architecture-and-threat-model)
    - [Desktop app](#desktop-app)
    - [Hoppscotch Agent](#hoppscotch-agent)
    - [Self-hosted instances](#self-hosted-instances)
  - [Security controls](#security-controls)
  - [Reporting a security vulnerability](#reporting-a-security-vulnerability)
  - [What does not qualify as a vulnerability](#what-does-not-qualify-as-a-vulnerability)

## Scope

This policy covers components in the [hoppscotch/hoppscotch](https://github.com/hoppscotch/hoppscotch) repository:

- **Desktop app**: the Tauri-based desktop client, including standalone use and connections to self-hosted or cloud-hosted instances.
- **Hoppscotch Agent**: the local relay service that runs on the user's machine and proxies requests from the web client.
- **Hoppscotch CLI**: the command-line client for running collections and tests, against either local collection files or an instance.
- **Self-hosted backend**: the Node.js backend, PostgreSQL data layer, and associated services deployed by self-hosting organisations.
- **Self-hosted web client and admin panel**: the web frontend and admin dashboard served by a self-hosted instance.

**Out of scope** (separate security boundaries):

- The cloud-hosted platform at hoppscotch.io or the website at hoppscotch.com.
  - If you find a vulnerability that spans both the cloud platform and a component covered here, report it; we will coordinate triage across boundaries.
- The Hoppscotch browser extension (separate repository and distribution channel).
- Third-party proxies or community forks.

## Architecture and threat model

Hoppscotch is a client-side API development and testing tool. The threat model differs by deployment mode.

### Desktop app

**The user is the operator.** The person sending API requests is the same person who configured the tool and entered their credentials. This is fundamentally different from a multi-tenant web service where untrusted users submit input to a shared backend.

**Local data storage is by design.** In standalone mode, the Desktop app persists collections, environments, request history, and credentials (including tokens, API keys, and other secrets) in local storage. This data is protected by OS-level access controls and, where enabled, full-disk encryption (FileVault, BitLocker, LUKS). When connected to a self-hosted or cloud backend, data syncs to the server while a local copy is retained (see the [self-hosted section](#self-hosted-instances)).

**Secret environment variables are stored locally and never synced to the server.** Environment variables marked as secret are kept in the client's local store (the Desktop app's data store or the browser's local storage, depending on platform) and are excluded from server sync. They follow the same local-data security posture as other credentials on that platform.

**The relay sends HTTP requests to arbitrary URLs provided by the user.** This includes localhost, private IP ranges, and cloud metadata endpoints. The relay runs on the user's machine, and the user controls what URLs it reaches. Separately, the Desktop app's realtime features (including WebSocket, SSE, Socket.IO, and MQTT) can also connect to user-specified endpoints under the same trust model: the user initiates and controls the connection.

**Per-domain TLS configuration is user-controlled.** The relay supports custom CA certificates, client certificates (PEM and PKCS#12), and per-domain toggles for host and peer verification. Users can disable TLS verification for specific domains to work with self-signed certificates or corporate PKI environments. These are deliberate operator choices on the user's own machine.

**The Desktop app loads web application bundles from instances the user adds.** When a user adds a self-hosted instance, the app downloads the instance's compiled web application (HTML, JavaScript, CSS) and runs it in an embedded webview. Remote bundles are verified with Ed25519 signatures and per-file BLAKE3 integrity hashes before loading (see [Security controls](#security-controls)). Bundles shipped with the installer are trusted as part of the build and release signing process. Adding an instance is an explicit trust decision, comparable to installing an extension or connecting to a self-hosted service.

**Debug-level logging is intentional.** The Desktop app logs at debug level by default and writes to rotating local log files. The log files sit alongside the same data in the application's own data store.

**Auto-updates are signature-verified.** The Desktop app checks `releases.hoppscotch.com` for available updates. Update manifests are verified against a public key before any binary is applied. This is a read-only check; no user data, credentials, or usage information is transmitted.

**Local backups are created on version changes.** The Desktop app creates backups of the local data store when the application version changes, retaining up to three backups. These backups follow the same security posture as the primary data store: local files protected by OS access controls.

### Hoppscotch Agent

The Agent is a standalone local service that acts as an HTTP relay for the Hoppscotch web client, providing capabilities the browser sandbox restricts (custom headers, localhost access, client certificates, CORS bypass).

**The Agent runs on the user's machine and listens on localhost.** It binds to port 9119 with a permissive CORS policy, meaning any origin can reach the port at the network level. Access control is enforced at the application layer through a registration handshake: the user enters a 6-digit one-time password displayed in the Agent UI, which establishes an encrypted communication channel (AES-256-GCM with X25519 key exchange). After registration, subsequent requests are authenticated and encrypted. The OTP does not expire and registration attempts are not rate-limited; the security assumption is that the user initiates registration intentionally while the Agent UI is visible.

**The same relay trust model applies.** The Agent sends requests to arbitrary user-specified URLs, including private IP ranges and localhost. The user controls what URLs it reaches and what TLS, proxy, and certificate configuration applies per domain.

**Agent data is stored locally.** Registration keys, per-domain settings (proxy configuration, client certificates, CA certificates, TLS verification toggles), and logs follow the same local-data security posture as the Desktop app.

### Self-hosted instances

With the backend deployed, the security model changes:

**The instance administrator is the operator; users are tenants.** Self-hosted instances support multiple users, teams, role-based access control, and shared collections. Authentication and authorisation boundaries must hold between users, and server-side data must be protected at rest and in transit.

**Data is stored server-side and locally.** Collections, environments, request history, and team data are persisted in PostgreSQL. Desktop app users connected to a self-hosted backend also retain a local copy; the local copy follows the same posture described in the [Desktop app section](#desktop-app). Credentials in shared team collections are accessible to team members with appropriate roles. The self-hosting organisation is responsible for database encryption, backup security, and access controls.

**Collections can be published via public URLs.** Self-hosted instances allow publishing collections as documentation accessible via UUID-based slugs. Published documentation is publicly accessible without authentication. The self-hosting organisation controls which collections are published.

**The admin dashboard has elevated privileges.** Instance administrators can view and manage all users, send invitations, and configure instance-wide settings through the admin interface. Admin actions are subject to role checks but operate across all teams and users on the instance.

**Infrastructure API tokens provide programmatic access.** The backend supports API tokens (infra tokens) with configurable expiry for programmatic access to instance management. These tokens should be treated with the same care as admin credentials.

**Backend session management.** User sessions use configurable cookie names and auto-generated session secrets. The self-hosting organisation can override session configuration via environment variables. Session secrets must be set explicitly in production deployments; auto-generated values are not suitable for production use.

**Optional analytics.** If `INFRA.ALLOW_ANALYTICS_COLLECTION` is enabled, the backend sends aggregate instance telemetry (user count, workspace count, version) to PostHog. Opt-in, disabled by default. No request content, credentials, or per-user data is included.

## Security controls

**Bundle signature verification.** Remote bundles from self-hosted instances are verified with Ed25519 signatures and per-file BLAKE3 hashes. A bundle with an invalid signature or hash mismatch is rejected and will not load. The signing key is fetched from the serving instance over the instance connection (TLS/HTTPS strongly recommended). Signature verification protects against bundle corruption in the local cache and against tampering in transit when the connection is trusted. It does not protect against a compromised instance, since the instance provides both the key and the bundle, nor against an active man-in-the-middle if the key is fetched over untrusted transport, since an attacker could replace both. The trust boundary is the connection to the instance and the user's decision to add it.

**Script sandboxing.** Pre-request and post-request scripts are isolated from the host environment. By default, scripts run in a QuickJS WebAssembly sandbox on every platform — isolated from the browser context, the Tauri IPC layer (on Desktop), and the host OS. The opt-out mechanism for the legacy compatibility mode differs per platform: Desktop and web expose the "Experimental scripting sandbox" toggle in Settings (on by default); the CLI opts in via the `--legacy-sandbox` flag. The legacy compatibility mode is retained as a backward-compatibility path for scripts that rely on host JavaScript semantics not exposed under QuickJS — on Desktop and web it runs scripts in a dedicated Web Worker using the `Function` constructor; on the CLI it runs scripts in an `isolated-vm` V8 isolate. The Web Worker legacy path does not provide the same isolation guarantees as QuickJS; the `isolated-vm` legacy path provides V8-isolate-level isolation but a different API surface from the QuickJS path. In the QuickJS paths, scripts receive controlled access to request data via the `pw`, `hopp`, and `pm` API namespaces, with request mutation limited to the documented pre-request APIs; network access is mediated through a controlled fetch hook, and scripts cannot make arbitrary system calls or access the filesystem. The Web Worker legacy mode preserves a separate Web Worker execution context but exposes only the `pw` namespace and does not mediate access to standard worker globals such as `fetch`; users opting in accept that scripts can reach any URL the worker context can reach. Scripts imported from external collection files follow the same default-versus-legacy execution path and constraints as locally authored scripts.

**Update signature verification.** The auto-updater verifies update manifests against a public key before applying any update. A tampered manifest or binary will be rejected.

**Rate limiting.** The self-hosted backend enforces request rate limiting via configurable TTL and max-request thresholds (`INFRA.RATE_LIMIT_TTL`, `INFRA.RATE_LIMIT_MAX`). This applies to REST and GraphQL endpoints by default, though some authenticated mutations opt out of throttling where rate limiting would interfere with normal interactive use.

**GraphQL query complexity limiting.** The self-hosted backend enforces query complexity limits on the GraphQL API to prevent denial-of-service through deeply nested or expensive queries.

## Reporting a security vulnerability

We use [GitHub Security Advisories](https://github.com/hoppscotch/hoppscotch/security/advisories) to manage reports. If you do not receive a response, reach out to support@hoppscotch.io with the GHSA advisory link.

If you disagree with our assessment, reply on the advisory with additional context or evidence. We will re-evaluate.

Reports must demonstrate familiarity with the architecture and threat model described in this document. A report that flags a behaviour already documented here as intentional, or that applies a generic vulnerability classification (such as SSRF, insecure storage, or CORS misconfiguration) without explaining how the finding circumvents the stated trust model, will be closed. This applies to all reports regardless of how they were produced, including those generated with AI tools, LLMs, or automated scanners.

> [!NOTE]
> Advisories may move to the relevant repository (for example, an XSS in a UI component might belong in [`@hoppscotch/ui`](https://github.com/hoppscotch/ui)). If in doubt, open your report in `hoppscotch/hoppscotch` GHSA.

**Do not create a GitHub issue to report a security vulnerability.**

## What does not qualify as a vulnerability

Review the threat model above before reporting. The architecture and threat model section documents deliberate design decisions for each component. A finding that matches a known vulnerability class (CWE, OWASP category, or similar) is not automatically a vulnerability in this project; the threat model explains why. Reports that restate a documented design decision as a vulnerability will be closed without further analysis. The following are by design or out of scope.

**Intended Desktop app and Agent behaviour:**
- The relay or Agent sending requests to private IP ranges, localhost, or cloud metadata endpoints. This is the product's core function.
- Credentials, tokens, or API keys stored in local storage, the application data store, local log files, or local backups on the user's machine. Local data is protected by OS-level access controls.
- Debug-level log output containing request details including headers and authentication data. The same data already exists in the local data store.
- A self-hosted instance bundle having access to application data within the Desktop app after passing signature verification. Adding an instance is an explicit trust decision.
- Users disabling TLS host or peer verification for specific domains. This is an operator-controlled per-domain setting for working with self-signed or internal certificates.
- WebSocket, SSE, Socket.IO, or MQTT connections reaching user-specified endpoints, including internal addresses. These are separate realtime features under the same trust model as HTTP relay requests.
- Pre-request or post-request scripts from imported collections executing in the sandbox. The sandbox applies equally to imported and locally authored scripts.
- The Desktop app checking `releases.hoppscotch.com` for updates. No user data is transmitted; update manifests are signature-verified.
- The Agent accepting connections from any origin on localhost:9119. CORS is permissive by design; access control is enforced through the registration handshake and encrypted channel.
- The Agent's registration OTP having no expiry and registration attempts not being rate-limited. The security assumption, documented in the Agent section above, is that the user initiates registration intentionally while the Agent UI is visible on their own machine. This is not CWE-307 (improper restriction of excessive authentication attempts) because the Agent is a local service, not a remote authentication endpoint.
- Theoretical attacks against the Desktop app or Agent that require prior local access to the user's machine, since the attacker already has access to the same data through the operating system.

**Intended self-hosted behaviour:**
- First-run configuration endpoints being accessible without authentication before any administrator exists. These endpoints are intentionally unauthenticated during initial bootstrap so that the self-hosting organisation can complete setup, and are gated once an administrator is provisioned. This is not CWE-306 (missing authentication for critical function); it is the documented bootstrap path. Reports against an uninitialised instance describe the intended path. Bootstrap-related findings against an instance that has already been onboarded are a distinct issue and should be reported.
- Published collections being accessible without authentication via their public URL. The self-hosting organisation controls which collections are published. This is not CWE-284 (improper access control); publication is an explicit operator action.
- The auto-generated session secret used when `INFRA.SESSION_SECRET` is not set. The threat model already notes that auto-generated values are not suitable for production deployments. The self-hosting organisation is responsible for setting explicit secrets in their environment configuration.
- Some authenticated GraphQL mutations opting out of rate limiting. These opt-outs are intentional where throttling would interfere with normal interactive use and are scoped to authenticated sessions.

**Out of scope:**
- Vulnerabilities in dependencies without a demonstrated practical attack against Hoppscotch.
- Automated scanner output, AI-generated vulnerability reports, or generic security assessments that have not been validated against this document's architecture and threat model. A report must identify what specific security control is missing or bypassable in context, not merely flag a code pattern that matches a known vulnerability class. Tools that scan a codebase and produce findings without reading the threat model will generate false positives against this project.
- Applying a generic vulnerability classification to behaviour this document explains as intentional. Sending HTTP requests to user-specified private IP ranges is the product's core function, not server-side request forgery (CWE-918). Storing credentials in local files on the user's own machine is the expected data model for a single-user developer tool, not insecure credential storage (CWE-312). A permissive CORS policy on a localhost service with application-layer authentication is documented above, not a CORS misconfiguration (CWE-942).
- Missing HTTP security headers (Content-Security-Policy, Strict-Transport-Security, X-Frame-Options) on the self-hosted web client without a demonstrated attack that the header would have prevented in this application's deployment context.
- Findings against hoppscotch.io or hoppscotch.com; report through the platform's security channel. Cross-boundary reports involving both a self-hosted component and the cloud platform are accepted here and will be coordinated.
