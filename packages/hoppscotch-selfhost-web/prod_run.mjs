#!/usr/local/bin/node
import { execFileSync } from "child_process"
import fs from "fs"
import net from "net"
import os from "os"
import path from "path"

// Probe the real bind so the kernel decides (CAP_NET_BIND_SERVICE, port sysctls),
// not a UID guess.
async function assertPortBindable(port) {
  await new Promise((resolve) => {
    const probe = net.createServer()
    probe.once("error", (err) => {
      if (err.code === "EACCES") {
        console.error(`Cannot bind port ${port} as the current user: set HOPP_ALTERNATE_PORT to a free port >= 1024, or run as root / grant CAP_NET_BIND_SERVICE.`)
        process.exit(1)
      }
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use inside the container: set HOPP_ALTERNATE_PORT to a free port.`)
        process.exit(1)
      }
      console.warn(`Skipping bind preflight for port ${port} (${err.code})`)
      resolve()
    })
    probe.listen(port, () => probe.close(resolve))
  })
}

// Empty means unset (compose passes undefined vars as ""), so the :80 default
// applies. The image CMD also unsets an empty value before launching Caddy.
if (process.env.HOPP_ALTERNATE_PORT === "") delete process.env.HOPP_ALTERNATE_PORT

// Sanity-check the value; real bindability is probed below.
const RESERVED_PORTS = ["3000", "3200"]
const altPort = process.env.HOPP_ALTERNATE_PORT
if (altPort !== undefined) {
  if (!(/^[0-9]+$/.test(altPort) && +altPort >= 1 && +altPort <= 65535)) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is invalid: use an integer in 1-65535 (e.g. 8000).`)
    process.exit(1)
  }
  if (RESERVED_PORTS.includes(String(+altPort))) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is already used by this image (${RESERVED_PORTS.join(", ")}); pick another port (e.g. 8000).`)
    process.exit(1)
  }
}

// Caddy always binds this port (env value or the :80 default).
await assertPortBindable(+(process.env.HOPP_ALTERNATE_PORT ?? 80))

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
