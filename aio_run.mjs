#!/usr/local/bin/node
// @ts-check

import { execFileSync, spawn } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import process from "process"

// Back-compat: honour the legacy HOPP_AIO_ALTERNATE_PORT when the new var is unset.
if (!process.env.HOPP_ALTERNATE_PORT && process.env.HOPP_AIO_ALTERNATE_PORT) {
  process.env.HOPP_ALTERNATE_PORT = process.env.HOPP_AIO_ALTERNATE_PORT
}

// Caddy bind port — when set, must be an unprivileged integer (1024-65535).
const RESERVED_PORTS = ["8080", "3200"]
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

const caddyFileName = process.env.ENABLE_SUBPATH_BASED_ACCESS === 'true' ? 'aio-subpath-access.Caddyfile' : 'aio-multiport-setup.Caddyfile'
const caddyProcess = runChildProcessWithPrefix("caddy", ["run", "--config", `/etc/caddy/${caddyFileName}`, "--adapter", "caddyfile"], "App/Admin Dashboard Caddy")
const backendProcess = runChildProcessWithPrefix("node", ["/dist/backend/dist/src/main.js"], "Backend Server")
const webappProcess = runChildProcessWithPrefix("webapp-server", [], "Webapp Server")

caddyProcess.on("exit", (code) => {
  console.log(`Exiting process because Caddy Server exited with code ${code}`)
  process.exit(code)
})

backendProcess.on("exit", (code) => {
  console.log(`Exiting process because Backend Server exited with code ${code}`)
  process.exit(code)
})

webappProcess.on("exit", (code) => {
  console.log(`Exiting process because Webapp Server exited with code ${code}`)
  process.exit(code)
})

process.on('SIGINT', () => {
  console.log("SIGINT received, exiting...")

  caddyProcess.kill("SIGINT")
  backendProcess.kill("SIGINT")
  webappProcess.kill("SIGINT")

  process.exit(0)
})
