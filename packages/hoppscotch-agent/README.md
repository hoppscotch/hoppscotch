<div align="center">
   <img align="center" width="128px" src="public/icon.png" />
   <h1 align="center"><b>Hoppscotch Agent</b></h1>
   <h2 align="center">
      <a href="https://github.com/hoppscotch/agent-releases">Download</a> |
      <a href="https://docs.hoppscotch.io/documentation/clients/agent">Official Docs</a>
   </h2>
</div>

<br/>

#### Hoppscotch Agent is a cross-platform HTTP request relay for Hoppscotch built with [Tauri V2](https://v2.tauri.app/) that adds capabilities like custom headers, certificates, proxies, and local access typically restricted in browsers.

The agent runs as a local system service on port `9119`, acting as an intermediary between the Hoppscotch web application and target APIs. It establishes an encrypted communication channel authenticated via an OTP registration process.

## Installation

### Standard Installation

1. Download the latest version of Hoppscotch Agent from [releases](https://github.com/hoppscotch/agent-releases)
2. Run the installer
3. Follow the installation wizard to complete setup
4. The agent automatically starts and appears in your system tray

### Portable Version

The portable version runs without installation and does not include automatic updates.

1. Download the portable version for your operating system
2. Extract the archive to your desired location
3. Run the executable directly
4. The agent will start and appear in your system tray

> [!Note]
> The portable version uses a separate configuration (`tauri.portable.conf.json`) that disables bundling and updater functionality.

## Getting Started

### Registration

1. Open Hoppscotch web app and navigate to **Settings** → **Interceptors**
2. Select **Agent** from the available interceptors  
3. Click **Register Agent** button
4. The agent window displays a 6-digit verification code
5. Enter the verification code in the OTP input field
6. Click the confirm button to establish connection
7. The agent displays a masked auth key hash when successfully registered

### Usage

Once registered, all HTTP requests made through Hoppscotch are processed by the agent. The agent provides:

- CORS bypass by processing requests locally
- Client certificate authentication for mutual TLS
- HTTP Digest Authentication using challenge-response mechanisms  
- Custom headers that browsers typically restrict
- Proxy routing with authentication support
- Local network and localhost access
- SSL/TLS verification controls
- And much more

## Domain-Specific Configuration

The agent (and `Native`) interceptor supports per-domain configuration overrides with a global default (`*`) domain:

### Domain Management
- **Global Defaults**: Base settings applied to all domains (domain: `*`)
- **Domain Overrides**: Specific settings for individual domains (e.g., `api.example.com`)
- **Domain Addition**: Add new domains through the domain management modal
- **Domain Removal**: Remove custom domain configurations (global default cannot be removed)

### SSL/TLS Security Settings

For each domain, configure:

- **Verify Host**: Enable/disable hostname verification during SSL handshake
- **Verify Peer**: Enable/disable peer certificate verification
- **CA Certificates**: Upload custom Certificate Authority certificates for domain validation
- **Client Certificates**: Configure client certificates for mutual TLS authentication

## Client Certificates

The agent supports client certificate authentication for APIs requiring mutual TLS:

### Certificate Formats
- **.pem certificates**: Requires separate certificate (.crt/.cer/.pem) and private key (.key/.pem) files
- **.pfx/.pkcs12 certificates**: Single file format with optional password protection

### Configuration

1. Access **Settings** → **Interceptors** → **Agent** in Hoppscotch
2. Select the target domain from the domain selector
3. Click **Client Certificates** button
4. Choose certificate format (PEM or PFX tab)
5. Upload certificate files:
   - **PEM**: Upload certificate file and private key file separately  
   - **PFX**: Upload .pfx/.pkcs12 file and enter password if required
6. Configuration is automatically saved per domain

### CA Certificates

Custom Certificate Authority certificates can be added per domain:

1. Navigate to the CA Certificates section for the target domain
2. Click **Add Certificate File** 
3. Upload the CA certificate file
4. Toggle certificate inclusion on/off as needed
5. Remove certificates using the trash icon

## Proxy Configuration

The agent supports HTTP/HTTPS proxy routing with authentication (including NTLM):

### Proxy Settings
- **Proxy URL**: HTTP/HTTPS proxy server address with port
- **Proxy Authentication**: Username and password for proxy server authentication
- **Per-Domain**: Each domain can have different proxy configurations

### Configuration

1. Select the target domain
2. Toggle the **Proxy** switch to enable
3. Enter the proxy URL (e.g., `http://proxy.example.com:8080`)
4. Configure proxy authentication if required:
   - Username field
   - Password field (with show/hide toggle)

## System Integration

### System Tray
The agent runs with system tray integration, providing access to:
- **Show Registrations**: View active connections and registration status
- **Clear Registrations**: Remove all registered instances  
- **Maximize Window**: Show the agent interface window
- **Quit**: Exit the agent application

### Configuration Storage
The agent stores configuration in platform-specific locations:

- **Windows**: `%APPDATA%\io.hoppscotch.agent\`
- **macOS**: `~/Library/Application Support/io.hoppscotch.agent/`  
- **Linux**: `~/.config/io.hoppscotch.agent/`

### Logging
Logs are stored in platform-specific directories:

- **Windows**: `%LOCALAPPDATA%\io.hoppscotch.agent\logs\`
- **macOS**: `~/Library/Logs/io.hoppscotch.agent/`
- **Linux**: `~/.local/share/io.hoppscotch.agent/logs/`

### Auto-Start Configuration
The standard installation includes auto-start functionality. The portable version does not include auto-start and must be launched manually.

## Building from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) package manager
- [Rust](https://rustup.rs/) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Development

```bash
# Clone the repository  
git clone https://github.com/hoppscotch/hoppscotch.git
cd hoppscotch/packages/hoppscotch-agent

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
```

### Production Build

```bash
# Build standard version
pnpm tauri build

# Build portable version  
pnpm tauri build --config src-tauri/tauri.portable.conf.json
```

The built applications will be available in `src-tauri/target/release/bundle/`

### Build Variants

Two build configurations are available:

- **Standard** (`tauri.conf.json`): Includes installer, auto-updater, and auto-start functionality
- **Portable** (`tauri.portable.conf.json`): Standalone executable without installation requirements

## Network Configuration

### Default Port
The agent runs on port `9119` by default. Make sure this port is not blocked by firewalls.

### Communication Protocol
- **Encryption**: AES-256-GCM for all agent-to-web-app communication
- **Authentication**: X25519 key exchange for secure channel establishment
- **Registration**: One-time 6-digit OTP verification process

## System Requirements

### Windows
- **OS Version**: Windows 10 1803+ or Windows 11
- **Architecture**: x64
- **Dependencies**: WebView2 Runtime (auto-installed for standard version)

### macOS  
- **OS Version**: macOS 10.15 (Catalina) or later
- **Architecture**: Intel x64 or Apple Silicon (ARM64)

### Linux
- **Architecture**: x64
- **Dependencies**: WebKit2GTK 2.44.0+ (usually pre-installed)
- **Minimum**: Systems with GLIBC 2.38+

## Troubleshooting

### Agent Detection Issues
1. **"Agent not detected" popup**: Verify the agent is running by checking the system tray for the Hoppscotch icon
2. **Switching interceptors blocked**: If the "Agent not detected" popup prevents switching interceptors, restart your browser and stop the agent before changing interceptor settings
3. **Port accessibility**: Check that no firewall is blocking port `9119`  
4. **Browser compatibility**: Safari on macOS may have CORS issues with localhost:9119 due to access control checks, try Chrome/Firefox for agent registration

### Registration Failures  
1. **"Failed to initiate the registration"**: This error may occur due to browser security policies or extension conflicts
2. **Missing OTP input field**: Verify the agent window is focused and displaying a 6-digit verification code
3. **OTP expiration**: Registration codes have limited lifetime, restart the registration process if the code expires
4. **Network connectivity**: Verify browser can reach localhost:9119/handshake
5. **Version compatibility**: Some agent versions may be incompatible with specific Hoppscotch web app versions. For self-hosted setups, make sure Agent version in the release matches, see https://github.com/hoppscotch/hoppscotch/issues/4936#issuecomment-2756981053

### Certificate Issues
1. Verify certificate format is supported (.pem or .pfx/.pkcs12)
2. Check certificate expiration dates
3. Confirm private key matches certificate (for .pem files)
4. Verify domain configuration matches target API hostname
5. Confirm certificate password is correct (for .pfx/.pkcs12)
6. Check CA certificate inclusion status (toggle on/off)

### Request Processing Issues
1. **Custom headers not applied**: Verify the agent is selected as interceptor, browsers may override headers like User-Agent when using default HTTP methods
2. **CORS errors**: Confirm agent interceptor is active and requests are routing through localhost:9119
3. **SSL/TLS verification**: Check verify host/peer settings for the target domain
4. **Proxy routing**: Verify proxy URL format includes protocol (http:// or https://)

### System-Specific Issues

#### Windows
1. Check WebView2 Runtime is installed (auto-installed with standard version)
2. Check Windows Defender or antivirus exclusions for the agent executable
3. Verify agent has network permissions through Windows Firewall

#### macOS  
1. Safari browser may block agent connections due to CORS policies, try Chrome or Firefox instead
2. Check macOS Gatekeeper settings if agent fails to start
3. Verify agent is allowed in System Preferences →  Security & Privacy

#### Linux
1. Check WebKit2GTK dependencies are installed
2. Check systemd logs if agent fails to start as service
3. Verify GLIBC version compatibility (requires 2.38+)

### Portable Version Issues
1. Manual WebView2 installation - may be required on older versions of Windows
2. No auto-start capability - must launch manually after system restart  
3. No automatic updates - download new versions manually
4. Verify executable permissions on Unix-like systems
5. Check that portable version is extracted to a writable directory

### Log
Check agent logs for detailed error information:
- **Windows**: `%LOCALAPPDATA%\io.hoppscotch.agent\logs\`
- **macOS**: `~/Library/Logs/io.hoppscotch.agent/`
- **Linux**: `~/.local/share/io.hoppscotch.agent/logs/`

Look for connection errors, certificate validation failures, or proxy authentication issues in the log files.
