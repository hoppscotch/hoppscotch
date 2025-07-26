# Hoppscotch Agent <sup>BETA</sup>

<div align="center">
   <img align="center" width="128px" src="../../public/logo.svg" />
   <h1 align="center"><b>Hoppscotch Agent</b></h1>
   <h2 align="center">
      <a href="https://docs.hoppscotch.io/documentation/features/interceptor">Download</a> |
      <a href="https://docs.hoppscotch.io/documentation/features/interceptor">Official Docs</a>
   </h2>
</div>

<br/>

#### A cross-platform HTTP request agent for Hoppscotch for advanced request handling including CORS override, custom headers, certificates, proxies, and local system integration.

The Hoppscotch Agent is a standalone desktop application built with [Tauri V2](https://v2.tauri.app/) that enables Hoppscotch web applications to make HTTP requests with advanced capabilities that browsers cannot provide due to security restrictions.

## Features

- **🌐 CORS Bypass**: Access APIs blocked by Cross-Origin Resource Sharing (CORS) restrictions
- **🔒 Advanced Authentication**: Client certificate authentication (mTLS) and custom CA certificates
- **🏢 Enterprise Support**: Corporate proxy configurations with authentication
- **📋 Custom Headers**: Send restricted headers that browsers normally block
- **🖥️ Local Access**: Make requests to localhost and internal networks from web-hosted Hoppscotch
- **🔐 Secure Communication**: Encrypted request/response handling with AES-GCM encryption
- **🎯 System Tray Operation**: Runs quietly in the background
- **🔗 Easy Registration**: Simple 6-digit OTP-based pairing with Hoppscotch apps

## Installation

1. **Download** the latest version from the [official documentation](https://docs.hoppscotch.io/documentation/features/interceptor)
2. **Install** the application for your platform (Windows, macOS, or Linux)
3. **Run** the Hoppscotch Agent - it will start in the system tray

## Usage

### Getting Started

1. **Start the Agent**: Launch the Hoppscotch Agent (runs on `localhost:9119`)
2. **Open Hoppscotch**: Use any Hoppscotch application (web, desktop, or self-hosted)
3. **Automatic Detection**: Hoppscotch will automatically detect the running agent

### First-Time Registration

When you first use the agent with a Hoppscotch application:

1. **Trigger Registration**: Make a request that requires agent capabilities
2. **Get OTP Code**: The agent window will appear with a 6-digit code
3. **Enter Code**: Copy the code and paste it in the Hoppscotch registration modal
4. **Complete Setup**: Registration is saved and persists across sessions

### When the Agent is Used

The agent automatically handles requests when:

- **CORS Restrictions**: Browser blocks cross-origin requests
- **Local Development**: Accessing localhost APIs from web-hosted Hoppscotch
- **Enterprise Networks**: Corporate firewalls or proxy requirements
- **Advanced Auth**: Client certificates or custom CA requirements
- **Restricted Headers**: Headers that browsers security policies block

## Interceptor Selection

In Hoppscotch, you can choose your interceptor:

- **Browser** (Default): Standard browser-based requests
- **Agent**: Advanced capabilities via the desktop agent
- **Proxy**: Requests through Proxyscotch
- **Extension**: Browser extension-based requests

## Architecture

### Frontend (Vue.js + TypeScript)

- **Registration Interface**: Displays OTP codes and manages connections
- **Status Management**: Shows connected applications and registration history
- **User Controls**: Copy codes, minimize to tray, cancel operations

### Backend (Rust + Tauri)

- **HTTP Server**: Secure API server on `localhost:9119`
- **Request Processing**: Encrypted request/response cycles
- **Native Capabilities**: System-level access for advanced features
- **Security Layer**: AES-GCM encryption and authentication

## Minimum System Requirements

### Windows

- **OS Version**: Windows 10 1803+ or Windows 11
- **Architecture**: x64

### macOS

- **OS Version**: macOS 10.15 (Catalina) or later
- **Architecture**: Intel x64 or Apple Silicon (ARM64)

### Linux

- **Architecture**: x64
- **Recommended OS**: Ubuntu 20.04 or newer (or similar distributions)
- **Dependencies**: WebKit2GTK 4.0

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v16 or later)
- [pnpm](https://pnpm.io/) (latest)

### Building from Source

1. **Clone the repository**:

   ```bash
   git clone https://github.com/hoppscotch/hoppscotch.git
   cd hoppscotch/packages/hoppscotch-agent
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Development mode**:

   ```bash
   pnpm tauri dev
   ```

4. **Build for production**:
   ```bash
   pnpm tauri build
   ```

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Security

The Hoppscotch Agent implements several security measures:

- **Encrypted Communication**: All data between Hoppscotch and the agent is encrypted using AES-GCM
- **User-Controlled Registration**: Manual OTP-based pairing prevents unauthorized access
- **Local-Only Server**: Agent only accepts connections from localhost
- **Secure Authentication**: Bearer token authentication for all requests
- **Certificate Validation**: Configurable SSL/TLS certificate validation

## Troubleshooting

### Common Issues

**Agent not detected**:

- Ensure the agent is running (check system tray)
- Verify no firewall is blocking port 9119
- Try restarting the agent

**Registration fails**:

- Double-check the 6-digit OTP code
- Ensure you're entering the code within the time limit
- Restart both agent and Hoppscotch app if needed

**Requests still blocked**:

- Verify "Agent" is selected as the interceptor
- Check that the agent registration is still valid
- Review any proxy or certificate configurations

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](../../CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Hoppscotch Agent is released under the [MIT License](../../LICENSE).
