#!/usr/local/bin/node
import { execFileSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"

// Compose passes undefined host vars through as ""; treat empty as unset so the
// Caddyfile default (:80) applies. (Caddy itself is started by the image CMD,
// which applies the same empty-means-unset rule before launching it.)
if (process.env.HOPP_ALTERNATE_PORT === "") delete process.env.HOPP_ALTERNATE_PORT

// Caddy bind port — when set, must be a bindable integer (root may bind any port;
// other UIDs can't bind below 1024).
const RESERVED_PORTS = ["3000", "3200"]
const MIN_PORT = process.getuid?.() === 0 ? 1 : 1024
const altPort = process.env.HOPP_ALTERNATE_PORT
if (altPort !== undefined) {
  if (!(/^[0-9]+$/.test(altPort) && +altPort >= MIN_PORT && +altPort <= 65535)) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is invalid: use an integer in ${MIN_PORT}-65535 (e.g. 8000)${MIN_PORT > 1 ? " — ports below 1024 need root" : ""}.`)
    process.exit(1)
  }
  if (RESERVED_PORTS.includes(String(+altPort))) {
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
