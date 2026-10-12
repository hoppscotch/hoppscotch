#!/usr/local/bin/node
// @ts-check

import { execFileSync, spawn } from "child_process"
import fs from "fs"
import net from "net"
import os from "os"
import path from "path"
import process from "process"

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

// Empty means unset (compose passes undefined vars as ""), so the :80 default applies.
if (process.env.HOPP_ALTERNATE_PORT === "") delete process.env.HOPP_ALTERNATE_PORT
if (process.env.HOPP_AIO_ALTERNATE_PORT === "") delete process.env.HOPP_AIO_ALTERNATE_PORT

// Back-compat: fall back to the legacy var when the new one is unset.
const legacyPortApplied = !process.env.HOPP_ALTERNATE_PORT && !!process.env.HOPP_AIO_ALTERNATE_PORT
if (legacyPortApplied) {
  process.env.HOPP_ALTERNATE_PORT = process.env.HOPP_AIO_ALTERNATE_PORT
}

const useSubpathAccess = process.env.ENABLE_SUBPATH_BASED_ACCESS === "true"

// Sanity-check the value; real bindability is probed below.
const RESERVED_PORTS = ["8080", "3200"]
const altPort = process.env.HOPP_ALTERNATE_PORT
// Name whichever var the operator actually set.
const altPortVar = legacyPortApplied ? "HOPP_AIO_ALTERNATE_PORT" : "HOPP_ALTERNATE_PORT"
if (altPort !== undefined) {
  if (!(/^[0-9]+$/.test(altPort) && +altPort >= 1 && +altPort <= 65535)) {
    console.error(`${altPortVar}="${altPort}" is invalid: use an integer in 1-65535 (e.g. 8000).`)
    process.exit(1)
  }
  if (RESERVED_PORTS.includes(String(+altPort))) {
    console.error(`${altPortVar}="${altPort}" is already used by this image (${RESERVED_PORTS.join(", ")}); pick another port (e.g. 8000).`)
    process.exit(1)
  }
  if (!useSubpathAccess) {
    console.warn(`${altPortVar} has no effect in multiport mode (Caddy binds 3000/3100/3170); it applies only when ENABLE_SUBPATH_BASED_ACCESS=true.`)
  }
}

// Only subpath mode binds the configurable port; multiport uses fixed ports.
if (useSubpathAccess) {
  await assertPortBindable(+(process.env.HOPP_ALTERNATE_PORT ?? 80))
}

function runChildProcessWithPrefix(command, args, prefix) {
  const childProcess = spawn(command, args);

  childProcess.stdout.on('data', (data) => {
    const output = data.toString().trim().split('\n');
    output.forEach((line) => {
      console.log(`${prefix} | ${line}`);
    });
  });

  childProcess.stderr.on('data', (data) => {
    const error = data.toString().trim().split('\n');
    error.forEach((line) => {
      console.error(`${prefix} | ${line}`);
    });
  });

  childProcess.on('close', (code) => {
    console.log(`${prefix} Child process exited with code ${code}`);
  });

  childProcess.on('error', (stuff) => {
    console.log("error")
    console.log(stuff)
  })

  return childProcess
}

const envFileContent = Object.entries(process.env)
  .filter(([env]) => env.startsWith("VITE_"))
  .sort(([envA], [envB]) => envA.localeCompare(envB))
  .map(([env, val]) => `${env}=${
    (val.startsWith("\"") && val.endsWith("\""))
      ? val
      : `"${val}"`
  }`)
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

const caddyFileName = useSubpathAccess ? 'aio-subpath-access.Caddyfile' : 'aio-multiport-setup.Caddyfile'
const caddyProcess = runChildProcessWithPrefix("caddy", ["run", "--config", `/etc/caddy/${caddyFileName}`, "--adapter", "caddyfile"], "App/Admin Dashboard Caddy")
const backendProcess = runChildProcessWithPrefix("node", ["/dist/backend/dist/src/main.js"], "Backend Server")
const webappProcess = runChildProcessWithPrefix("webapp-server", [], "Webapp Server")

caddyProcess.on("exit", (code) => {
  console.log(`Exiting process because Caddy Server exited with code ${code}`)
  // code is null on signal death; report failure, not success.
  process.exit(code ?? 1)
})

backendProcess.on("exit", (code) => {
  console.log(`Exiting process because Backend Server exited with code ${code}`)
  process.exit(code ?? 1)
})

webappProcess.on("exit", (code) => {
  console.log(`Exiting process because Webapp Server exited with code ${code}`)
  process.exit(code ?? 1)
})

process.on('SIGINT', () => {
  console.log("SIGINT received, exiting...")

  caddyProcess.kill("SIGINT")
  backendProcess.kill("SIGINT")
  webappProcess.kill("SIGINT")

  process.exit(0)
})
