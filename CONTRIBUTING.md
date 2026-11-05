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

- Node.js 20+ (check with `node -v`)
- pnpm 9+ (check with `pnpm -v`)
- Git
- Docker (optional, for self-hosted setup)

### Development Setup

1. Clone and install dependencies: `pnpm install`
2. Start development server: `pnpm dev`
3. Run tests including CLI tests (see [#4136](https://github.com/hoppscotch/hoppscotch/issues/4136)): `pnpm test`
