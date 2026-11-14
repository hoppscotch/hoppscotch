# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

Please note we have a code of conduct, please follow it in all your interactions with the project.

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a
   build.
2. Update the README.md with details of changes to the interface, this includes new environment
   variables, exposed ports, useful file locations and container parameters.
3. Make sure you do not expose environment variables or other sensitive information in your PR.

### Prerequisites

- Node.js 22+ (check with `node -v`). `@hoppscotch/cli` and `@hoppscotch/js-sandbox` require
  Node.js 22 or newer, and the CI test workflow runs on Node 22.
- pnpm 10.34.5 (check with `pnpm -v`). This is the version pinned by the `packageManager` field
  in the root `package.json`, and `pnpm install` refuses to run on an older major.
- Git
- Docker (optional, for the self-hosted setup)

### Development Setup

1. Clone and install dependencies: `pnpm install`
2. Create your local environment file: `cp .env.example .env` at the repository root, then set
   `VITE_BACKEND_API_URL` to the backend the web app should talk to (the local dev backend
   `http://localhost:3170`, or `https://api.hoppscotch.io` for the hosted one). Without this file
   the sign-in links resolve to `undefined/auth/github`.
3. Start the dev servers (this also generates the Prisma client): `pnpm dev`
4. Run the test suites, including the CLI tests (see [#4136](https://github.com/hoppscotch/hoppscotch/issues/4136)): `pnpm test`
