#!/usr/local/bin/node
import { execFileSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

// Caddy bind port — when set, must be an unprivileged integer (1024-65535).
const RESERVED_PORTS = ["3000", "3200"]
const altPort = process.env.HOPP_ALTERNATE_PORT
if (altPort !== undefined) {
  if (!(/^[0-9]+$/.test(altPort) && +altPort >= 1024 && +altPort <= 65535)) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is invalid: use an integer in 1024-65535 (e.g. 8000).`)
    process.exit(1)
  }
  if (RESERVED_PORTS.includes(altPort)) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is already used by this image (${RESERVED_PORTS.join(", ")}); pick another port (e.g. 8000).`)
    process.exit(1)
  }
}

const envFileContent = Object.entries(process.env)
  .filter(([env]) => env.startsWith("VITE_"))
  .sort(([envA], [envB]) => envA.localeCompare(envB))
  .map(
    ([env, val]) =>
      `${env}=${val.startsWith('"') && val.endsWith('"') ? val : `"${val}"`}`
  )
  .join("\n")

// Write to a temp dir (not cwd) so a non-root UID needn't own the working directory.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hopp-env-"))
const buildEnvPath = path.join(tmpDir, "build.env")

try {
  fs.writeFileSync(buildEnvPath, envFileContent)
  // Call the global binary directly (not npx, which needs a writable $HOME cache).
  execFileSync("import-meta-env", ["-x", buildEnvPath, "-e", buildEnvPath, "-p", "/site/**/*"], { stdio: "inherit" })
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true })
}
