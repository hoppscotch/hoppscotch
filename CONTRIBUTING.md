# Contributing to Hoppscotch

First off, **thank you for taking the time to contribute!** 🎉

Hoppscotch is an open-source API development ecosystem, and contributions from the community are what make it great. Whether you're fixing a bug, improving documentation, suggesting a feature, or translating the UI — every contribution matters.

Please read this guide carefully before contributing. It helps everyone work together effectively.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Before You Start](#before-you-start)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Setting Up Your Local Development Environment](#setting-up-your-local-development-environment)
  - [Option A: Local Setup](#option-a-local-setup)
    - [1. Fork & Clone](#1-fork--clone)
    - [2. Install Dependencies](#2-install-dependencies)
    - [3. Set Up Environment Variables](#3-set-up-environment-variables)
    - [4. Start Services (PostgreSQL via Docker)](#4-start-services-postgresql-via-docker)
    - [5. Run Database Migrations](#5-run-database-migrations)
    - [6. Start the Development Server](#6-start-the-development-server)
  - [Option B: GitHub Codespaces / Dev Container](#option-b-github-codespaces--dev-container)
- [Working on Specific Packages](#working-on-specific-packages)
- [Environment Variable Reference](#environment-variable-reference)
- [Code Style & Formatting](#code-style--formatting)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Continuous Integration (CI)](#continuous-integration-ci)
- [Testing](#testing)
- [Translations](#translations)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [support@hoppscotch.io](mailto:support@hoppscotch.io).

---

## Before You Start

- **Search existing issues** before opening a new one — your question or bug may already be tracked.
- For significant changes, **open an issue first** to discuss your proposal with the maintainers. This avoids wasted effort.
- For minor fixes (typos, doc corrections, small bugs), feel free to open a PR directly.
- **Keep PRs small and focused** — limit each PR to one type of change (e.g. a single feature, or a single bugfix). Open multiple smaller PRs rather than one large one.
- Join the community on [Discord](https://hoppscotch.io/discord) or [Telegram](https://hoppscotch.io/telegram) for real-time discussion.

---

## Monorepo Structure

Hoppscotch is organized as a **pnpm monorepo**. All packages live under the `packages/` directory:

```
hoppscotch/
├── packages/
│   ├── hoppscotch-backend/        # NestJS + Prisma REST/GraphQL API server
│   ├── hoppscotch-selfhost-web/   # Vue 3 frontend (self-hosted)
│   ├── hoppscotch-sh-admin/       # Admin dashboard (Vue 3)
│   ├── hoppscotch-common/         # Shared logic, composables, stores
│   ├── hoppscotch-data/           # Data schemas and persistence logic
│   ├── hoppscotch-cli/            # CLI tool for running Hoppscotch from terminal
│   ├── hoppscotch-agent/          # Desktop agent for native HTTP requests
│   ├── hoppscotch-desktop/        # Tauri-based desktop application (Rust + Vue)
│   ├── hoppscotch-js-sandbox/     # Sandboxed JS script execution
│   ├── hoppscotch-kernel/         # Core kernel abstractions
│   ├── hoppscotch-relay/          # Relay/proxy utilities
│   └── codemirror-lang-graphql/   # CodeMirror GraphQL language extension
├── .env.example                   # Environment variable template
├── docker-compose.yml             # Full stack local services
├── pnpm-workspace.yaml            # pnpm workspace config
└── package.json                   # Root scripts and workspace definition
```

---

## Prerequisites

Ensure you have the following installed before starting:

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | **22.x** | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions |
| [pnpm](https://pnpm.io/) | **10.28.1** | Required — `npm` and `yarn` are **not** supported |
| [Docker](https://www.docker.com/) | Latest | For running PostgreSQL and other services locally |
| [Docker Compose](https://docs.docker.com/compose/) | v2+ | Included with Docker Desktop |
| [Git](https://git-scm.com/) | Latest | |

> **macOS ARM (Apple Silicon)?** Some native modules (like `bcrypt`) require Rosetta 2. Run `softwareupdate --install-rosetta` if you encounter build errors.

> **Linux users:** Ensure `libsoup3`, `webkitgtk`, and `librsvg` are installed if working on the desktop package.

### Optional (for Desktop / Rust packages)

| Tool | Version |
|------|---------|
| [Rust](https://rustup.rs/) | nightly (with `clippy`, `rustfmt`, `rust-src`) |
| [Cargo Tauri](https://tauri.app/v1/guides/getting-started/prerequisites) | Latest |
| [Go](https://go.dev/) | **1.24+** | Required for certain relay/kernel packages |

---

## Setting Up Your Local Development Environment

> **Two options:** You can set up locally (recommended for most contributors) or instantly via GitHub Codespaces / Dev Container (no local install needed).

### Option A: Local Setup

### 1. Fork & Clone

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/hoppscotch.git
cd hoppscotch

# Add the upstream remote to keep your fork in sync
git remote add upstream https://github.com/hoppscotch/hoppscotch.git
```

### 2. Install Dependencies

> ⚠️ **Only `pnpm` is supported.** The repository enforces this via a `preinstall` script. Using `npm install` or `yarn` will fail.

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm@10.28.1

# Install all workspace dependencies
pnpm install
```

This installs dependencies for **all packages** in the monorepo in a single command.

### 3. Set Up Environment Variables

Copy the example environment file and configure it for local development:

```bash
cp .env.example .env
```

Open `.env` and review the values. For a basic local setup, the defaults mostly work. Key variables to verify:

```env
# PostgreSQL connection (must match your Docker Compose config)
DATABASE_URL=postgresql://postgres:testpass@localhost:5432/hoppscotch

# 32-character encryption key — generate one securely:
# openssl rand -hex 16
DATA_ENCRYPTION_KEY=your_32_char_encryption_key_here

# Frontend URLs (default for local dev)
VITE_BASE_URL=http://localhost:3000
VITE_BACKEND_GQL_URL=http://localhost:3170/graphql
VITE_BACKEND_WS_URL=ws://localhost:3170/graphql
VITE_BACKEND_API_URL=http://localhost:3170/v1
VITE_ADMIN_URL=http://localhost:3100

# Allowed CORS origins
WHITELISTED_ORIGINS=http://localhost:3170,http://localhost:3000,http://localhost:3100
```

> **Never commit your `.env` file.** It is listed in `.gitignore` by default.

### 4. Start Services (PostgreSQL via Docker)

The `docker-compose.yml` uses **profiles**. For local development, start only the database using the `database` profile:

```bash
# Start just the PostgreSQL database
docker compose --profile database up -d
```

Wait a few seconds for PostgreSQL to initialize, then verify it's running:

```bash
docker compose ps
```

### 5. Run Database Migrations

```bash
# Run Prisma migrations on the backend package
cd packages/hoppscotch-backend
pnpm exec prisma migrate dev
cd ../..
```

If you're resetting a dev database from scratch:

```bash
cd packages/hoppscotch-backend
pnpm exec prisma migrate reset
cd ../..
```

### 6. Start the Development Server

From the **root of the monorepo**, run:

```bash
pnpm dev
```

This starts all packages in development mode concurrently. Once ready, you can access:

| Service | URL |
|---------|-----|
| Frontend (Web) | http://localhost:3000 |
| Backend API | http://localhost:3170 |
| Admin Dashboard | http://localhost:3100 |

### Option B: GitHub Codespaces / Dev Container

Hoppscotch includes a pre-configured [Dev Container](https://containers.dev/) that works with **GitHub Codespaces** and **VS Code Dev Containers**.

**GitHub Codespaces (no local install required):**

1. Open the repo on GitHub
2. Click **Code → Codespaces → Create codespace on main**
3. Wait for the container to build — it automatically runs `cp .env.example .env && pnpm install`
4. Open a terminal in Codespaces and run `pnpm dev`

**VS Code Dev Container (local Docker required):**

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the cloned repo in VS Code
3. Press `Ctrl+Shift+P` → **Dev Containers: Reopen in Container**
4. Once built, run `pnpm dev` in the integrated terminal

> The Devcontainer image (`typescript-node:18`) is the base image from Microsoft. The actual project requires Node.js **22.x** — after the container starts, verify your Node version with `node -v` and upgrade if needed using `nvm install 22`. Port 3000 is forwarded automatically.

---

## Working on Specific Packages

If you only need to work on one package, you can run its dev server in isolation:

```bash
# Run only the backend (NestJS watch mode)
cd packages/hoppscotch-backend
pnpm run start:dev

# Run only the web frontend
cd packages/hoppscotch-selfhost-web
pnpm run dev

# Run only the admin dashboard
cd packages/hoppscotch-sh-admin
pnpm run dev

# Run only the CLI (tsup watch mode)
cd packages/hoppscotch-cli
pnpm run dev
```

---

## Environment Variable Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `DATA_ENCRYPTION_KEY` | 32-char key for encrypting sensitive DB data | ✅ |
| `WHITELISTED_ORIGINS` | Comma-separated allowed CORS origins | ✅ |
| `VITE_BASE_URL` | Public URL of the frontend app | ✅ |
| `VITE_BACKEND_GQL_URL` | GraphQL endpoint URL | ✅ |
| `VITE_BACKEND_WS_URL` | WebSocket endpoint for GraphQL subscriptions | ✅ |
| `VITE_BACKEND_API_URL` | REST API endpoint | ✅ |
| `VITE_ADMIN_URL` | Admin dashboard URL | ✅ |
| `VITE_SHORTCODE_BASE_URL` | URL used for shortcode generation | ✅ |
| `TRUST_PROXY` | Set to `true` if behind a reverse proxy | ❌ |
| `ENABLE_SUBPATH_BASED_ACCESS` | Enable subpath routing (e.g. `/app`) | ❌ |
| `VITE_APP_TOS_LINK` | Custom Terms of Service URL | ❌ |
| `VITE_APP_PRIVACY_POLICY_LINK` | Custom Privacy Policy URL | ❌ |
| `VITE_PROXYSCOTCH_ACCESS_TOKEN` | Token for Proxyscotch (leave blank for public proxy) | ❌ |

---

## Code Style & Formatting

This project uses **Prettier** for code formatting. The configuration is defined in [`.prettierrc.js`](.prettierrc.js):

- No semicolons
- Double quotes for strings
- 2-space indentation
- Trailing commas where valid (ES5)
- Max line width: 80 characters

**Format your code before committing:**

```bash
# Format all files in the workspace
pnpm lintfix

# Run the linter (check only, no fix)
pnpm lint

# Run TypeScript type checks
pnpm typecheck
```

> Pre-commit hooks (via `husky` + `lint-staged`) automatically run lint and typecheck. Your commit will be rejected if there are errors.

---

## Commit Message Convention

This project follows the **[Conventional Commits](https://www.conventionalcommits.org/)** specification, enforced by `commitlint`.

### Format

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace (no logic changes) |
| `refactor` | Code restructuring (no feature/bug change) |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Build process, CI, dependency updates |
| `revert` | Reverting a previous commit |

### Examples

```bash
feat(backend): add OAuth2 provider support
fix(cli): handle timeout errors in run command
docs(contributing): add local dev setup guide
chore(deps): upgrade pnpm to 10.28.1
```

> ❌ **Invalid:** `Updated stuff`, `fix bug`, `WIP`
> ✅ **Valid:** `fix(frontend): resolve race condition in collection store`

---

## Pull Request Process

> **Protected branches:** Pushes directly to `main`, `next`, and `patch` are restricted. All changes must go through a Pull Request and pass CI before merging.

1. **Sync your fork** before starting work:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

3. **Make your changes** following the code style and commit conventions above.

4. **Push your branch** to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Open a Pull Request** against the `main` branch of `hoppscotch/hoppscotch`. The repository has a PR template — fill it out completely:

   ```
   Closes # <!-- Issue number -->

   ### What's changed
   <!-- Describe the changes point by point -->

   ### Notes to reviewers
   <!-- Anything the reviewer should be aware of -->
   ```

   Also include:
   - **Screenshots or recordings** for any UI changes
   - Link to the related issue with `Closes #<issue-number>`

6. **Keep PRs small and focused** — one PR per feature/fix. If your change is large, discuss splitting it with the maintainers first.

7. **Code owners are auto-assigned** based on which `packages/` directory your changes touch (see [CODEOWNERS](.github/CODEOWNERS)). Ensure the relevant owner approves before merging.

8. **Address review feedback** — keep your branch up to date with `main` during review.

### PR Checklist

Before submitting, ensure:

- [ ] My code follows the project's style guide and linting rules
- [ ] I have run `pnpm lint` and `pnpm typecheck` with no errors
- [ ] I have added or updated tests where appropriate
- [ ] I have updated the `README.md` if new environment variables or ports were added
- [ ] My commits follow the Conventional Commits format
- [ ] The PR title also follows the Conventional Commits format (it is validated by CI)
- [ ] I have not exposed any environment variables or secrets in my code
- [ ] I have removed all install or build artefacts that should not be committed
- [ ] Any Docker-related changes have been tested with `docker compose`

---

## Continuous Integration (CI)

GitHub Actions powers the CI pipeline. Every push and PR targeting `main`, `next`, or `patch` triggers automated checks:

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `tests.yml` | Push / PR to `main`, `next`, `patch` | Installs deps and runs `pnpm test` on Node 22 |
| `codeql-analysis.yml` | Push / PR | Static security analysis via GitHub CodeQL |
| `build-hoppscotch-desktop.yml` | Push / PR | Builds the Tauri desktop app for all platforms |
| `build-hoppscotch-agent.yml` | Push / PR | Builds the native agent binary |
| `release-push-docker.yml` | On release | Builds and pushes Docker images to registry |

> All status checks must pass before a PR can be merged. Do not merge if CI is red.

---

## Testing

Run the full test suite from the root:

```bash
pnpm test
```

Run tests for a specific package:

```bash
cd packages/hoppscotch-backend
pnpm run test

# With coverage
pnpm run test:cov

# In watch mode
pnpm run test:watch
```

For the CLI package:

```bash
cd packages/hoppscotch-cli
pnpm run test
```

> Always write tests for new features and bug fixes. PRs that decrease test coverage will need justification.

---

## Translations

Hoppscotch is localized into many languages. If you'd like to contribute a translation or improve an existing one, please read [TRANSLATIONS.md](TRANSLATIONS.md) for detailed instructions on how the i18n system works and how to submit translation PRs.

---

## Reporting Bugs

Before filing a bug report:

1. Search [existing issues](https://github.com/hoppscotch/hoppscotch/issues) to avoid duplicates.
2. Make sure you can reproduce the bug consistently.
3. Gather the following information:
   - Hoppscotch version
   - Browser and OS (for web app issues)
   - Deployment type (Cloud / Self-hosted / Desktop)
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots / console logs if applicable

[Open a new bug report →](https://github.com/hoppscotch/hoppscotch/issues/new/choose)

---

## Requesting Features

We welcome feature suggestions! Please:

1. Check the [roadmap](https://github.com/hoppscotch/hoppscotch/projects) and existing issues first.
2. Open a **Feature Request** issue using the provided template.
3. Describe the use case, not just the implementation — explain **why** the feature is needed.

---

## Security Vulnerabilities

**Do not report security vulnerabilities as public GitHub issues.**

Hoppscotch uses **GitHub Security Advisories (GHSA)** for responsible disclosure:

1. Go to [Security Advisories](https://github.com/hoppscotch/hoppscotch/security/advisories)
2. Click **"Report a vulnerability"** to open a private advisory
3. The team will respond within **48 hours**

If you receive no response within 48 hours, follow up at [support@hoppscotch.io](mailto:support@hoppscotch.io) with the GHSA advisory link.

> Note: Advisories may be transferred to a more specific repo (e.g. `@hoppscotch/ui`) if the vulnerability is isolated to a sub-component. When in doubt, always report to the main `hoppscotch/hoppscotch` GHSA.

Please also read our full [Security Policy](SECURITY.md) for details on supported platforms and what qualifies as a valid vulnerability.

---

## Common Issues & Troubleshooting

### `pnpm install` fails with `only-allow` error

You must use `pnpm`. Install it with:
```bash
npm install -g pnpm@10.28.1
```

### `Cannot find module: bcrypt` error

This is a known issue with native modules on some systems. Run:
```bash
npm rebuild bcrypt
```
Or inside the backend package directory:
```bash
cd packages/hoppscotch-backend && pnpm rebuild bcrypt
```

### Prisma engine errors on Linux (NixOS)

If you see a 404 error fetching Prisma engine binaries, set these environment variables:
```bash
export PRISMA_QUERY_ENGINE_LIBRARY=/path/to/libquery_engine.node
export PRISMA_QUERY_ENGINE_BINARY=/path/to/query-engine
export PRISMA_SCHEMA_ENGINE_BINARY=/path/to/schema-engine
```
See [Prisma NixOS discussion](https://github.com/prisma/prisma/discussions/3120) for details.

### Port conflicts

If a service fails to start due to a port already being in use:
```bash
# Find and kill the process using a port (e.g., 3170)
lsof -ti:3170 | xargs kill -9
```

### Docker database won't start

```bash
# Check Docker service logs
docker compose logs hoppscotch-db

# Reset and restart
docker compose down -v
docker compose up -d hoppscotch-db
```

### Environment variables not loading

Ensure your `.env` file is in the **root** of the repository (not inside a `packages/` subdirectory). The root `.env` is loaded by Vite, NestJS, and the Docker Compose configuration.

### TypeScript errors after pulling updates

After syncing with upstream, always reinstall dependencies:
```bash
git pull upstream main
pnpm install
pnpm typecheck
```

---

## Additional Resources

- 📖 [Hoppscotch Documentation](https://docs.hoppscotch.io)
- 💬 [Community Discord](https://hoppscotch.io/discord)
- 📢 [Community Telegram](https://hoppscotch.io/telegram)
- 🐦 [Twitter / X](https://twitter.com/hoppscotch_io)
- 🗺️ [Project Roadmap](https://github.com/hoppscotch/hoppscotch/projects)
- 💬 [GitHub Discussions](https://github.com/hoppscotch/hoppscotch/discussions)
- 🔒 [Security Policy](SECURITY.md)
- 🛡️ [Report a Vulnerability (GHSA)](https://github.com/hoppscotch/hoppscotch/security/advisories)
- 📋 [Code of Conduct](CODE_OF_CONDUCT.md)
- 🌍 [Translation Guide](TRANSLATIONS.md)
- 📝 [Changelog](CHANGELOG.md)

---

*Thank you for contributing to Hoppscotch! Your effort helps millions of developers build better APIs.* 🚀
