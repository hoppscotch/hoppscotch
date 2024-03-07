{
  "name": "@hoppscotch/js-sandbox",
  "version": "2.1.0",
  "description": "JavaScript sandboxes for running external scripts used by Hoppscotch clients",
  "type": "module",
  "files": [
    "dist",
    "index.d.ts"
  ],
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts"
    },
    "./web": {
      "import": "./dist/web.js",
      "require": "./dist/web.cjs",
      "types": "./dist/web.d.ts"
    },
    "./node": {
      "import": "./dist/node.js",
      "require": "./dist/node.cjs",
      "types": "./dist/node.d.ts"
    }
  },
  "types": "./index.d.ts",
  "engines": {
    "node": ">=14",
    "pnpm": ">=3"
  },
  "scripts": {
    "lint": "eslint --ext .ts,.js --ignore-path .gitignore .",
    "lintfix": "eslint --fix --ext .ts,.js --ignore-path .gitignore .",
    "test": "pnpm exec jest",
    "build": "vite build && tsc --emitDeclarationOnly",
    "clean": "pnpm tsc --build --clean",
    "postinstall": "pnpm run build",
    "prepublish": "pnpm run build",
    "do-lint": "pnpm run lint",
    "do-lintfix": "pnpm run lintfix",
    "do-typecheck": "pnpm exec tsc --noEmit",
    "do-build-prod": "pnpm run build",
    "do-test": "pnpm run test"
  },
  "keywords": [
    "hoppscotch",
    "sandbox",
    "js-sandbox",
    "apis",
    "test-runner"
  ],
  "author": "Hoppscotch (support@hoppscotch.io)",
  "license": "MIT",
  "dependencies": {
    "@hoppscotch/data": "workspace:^",
    "@types/lodash-es": "4.17.12",
    "fp-ts": "2.12.1",
    "lodash": "4.17.21",
    "lodash-es": "4.17.21"
  },
  "devDependencies": {
    "@digitak/esrun": "3.2.8",
    "@relmify/jest-fp-ts": "2.0.2",
    "@types/jest": "27.5.2",
    "@types/lodash": "4.14.182",
    "@types/node": "17.0.45",
    "@typescript-eslint/eslint-plugin": "5.30.6",
    "@typescript-eslint/parser": "5.30.6",
    "eslint": "8.19.0",
    "eslint-config-prettier": "8.6.0",
    "eslint-plugin-prettier": "4.2.1",
    "io-ts": "2.2.16",
    "jest": "27.5.1",
    "prettier": "2.8.4",
    "ts-jest": "27.1.5",
    "typescript": "4.9.5",
    "vite": "5.0.5"
  }
}