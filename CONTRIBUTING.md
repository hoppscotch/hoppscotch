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

1. Clone the repository: `git clone https://github.com/hoppscotch/hoppscotch.git`
   then enter it: `cd hoppscotch`
2. Install dependencies: `pnpm install`
3. Create your local environment file: `cp .env.example .env` at the repository root, then set
   the three backend URLs so they all point at the same backend (see `.env.example`):
   `VITE_BACKEND_API_URL=http://localhost:3170/v1`, `VITE_BACKEND_GQL_URL=http://localhost:3170/graphql` and
   `VITE_BACKEND_WS_URL=ws://localhost:3170/graphql` for the local dev backend (or
   `https://api.hoppscotch.io/v1`, `https://api.hoppscotch.io/graphql` and `wss://api.hoppscotch.io/graphql`
   for the hosted one — note the `/v1` suffix on the API URL). Without this file
   the sign-in links resolve to `undefined/auth/github`.
4. Start the dev servers: `pnpm dev`. (The Prisma client is generated during `pnpm install` via the backend
   package's `postinstall` script, not by `pnpm dev`.) This runs the web app only (via the
   `hoppscotch-selfhost-web` package's `do-dev` script); it does not start the backend, so the
   `localhost:3170` URLs above would have no server to connect to.
   To run the local backend and database, start PostgreSQL first (e.g.
   `docker compose up -d hoppscotch-db`, which uses the `DATABASE_URL` from `.env.example`),
   then run the backend dev server: `pnpm --filter hoppscotch-backend start:dev`
   (listens on port 3170). If you don't want a local backend, point the three URLs above at
   the hosted API instead and skip the backend command entirely.
5. Run the test suites, including the CLI tests (see [#4136](https://github.com/hoppscotch/hoppscotch/issues/4136)): `pnpm test`
