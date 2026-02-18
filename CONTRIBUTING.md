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

## Local Development Setup

1. Fork the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/hoppscotch.git
   cd hoppscotch
   ```

2. Install dependencies using [pnpm](https://pnpm.io/) (this project requires pnpm):

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

4. Before submitting a PR, run linting and type checks:

   ```bash
   pnpm lint
   pnpm typecheck
   ```
