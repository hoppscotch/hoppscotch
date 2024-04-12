#!/usr/bin/env node
// * The entry point of the CLI
// @ts-check

import { cli } from "../dist/index.js";

import { spawnSync } from "child_process";
import { cloneDeep } from "lodash-es";

const nodeVersion = parseInt(process.versions.node.split(".")[0]);

// As per isolated-vm documentation, we need to supply `--no-node-snapshot` for node >= 20
// src: https://github.com/laverdet/isolated-vm?tab=readme-ov-file#requirements
if (nodeVersion >= 20 && !process.execArgv.includes("--no-node-snapshot")) {
  const argCopy = cloneDeep(process.argv);

  // Replace first argument with --no-node-snapshot
  // We can get argv[0] from process.argv0
  argCopy[0] = "--no-node-snapshot";

  const result = spawnSync(
    process.argv0,
    argCopy,
    { stdio: "inherit" }
  );

  // Exit with the same status code as the spawned process
  process.exit(result.status ?? 0);
} else {
  cli(process.argv);
}
