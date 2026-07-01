#!/usr/local/bin/node
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';

// Guard: `HOPP_ALTERNATE_PORT` is the port Caddy binds to. It must not collide with
// a port already used by an internal service (backend 8080, webapp server 3200) or a
// fixed secondary port the Caddy config also binds (3000/3100/3170). Otherwise Caddy
// dies with a cryptic "address already in use" error and the container crash-loops.
// Fail fast with a clear message instead.
const RESERVED_PORTS = ['3000', '3100', '3170', '3200', '8080'];
const altPort = process.env.HOPP_ALTERNATE_PORT?.trim();
if (altPort && RESERVED_PORTS.includes(altPort)) {
  console.error(
    `HOPP_ALTERNATE_PORT is set to ${altPort}, which is reserved for internal Hoppscotch ` +
      `services (${RESERVED_PORTS.join(', ')}). Choose a different port >= 1024 (e.g. 8000).`
  );
  process.exit(1);
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
    console.log('error');
    console.log(stuff);
  });

  return childProcess;
}

const envFileContent = Object.entries(process.env)
  .filter(([env]) => env.startsWith('VITE_'))
  .sort(([envA], [envB]) => envA.localeCompare(envB))
  .map(
    ([env, val]) =>
      `${env}=${val.startsWith('"') && val.endsWith('"') ? val : `"${val}"`}`
  )
  .join('\n');

// Write the env file to a writable temp location (not the cwd) so the container
// can run under an arbitrary non-root UID that may not own the working directory.
const buildEnvPath = path.join(os.tmpdir(), 'build.env');

fs.writeFileSync(buildEnvPath, envFileContent);

execSync(`npx import-meta-env -x "${buildEnvPath}" -e "${buildEnvPath}" -p "/site/**/*"`);

fs.rmSync(buildEnvPath);

const caddyFileName =
  process.env.ENABLE_SUBPATH_BASED_ACCESS === 'true'
    ? 'sh-admin-subpath-access.Caddyfile'
    : 'sh-admin-multiport-setup.Caddyfile';
const caddyProcess = runChildProcessWithPrefix(
  'caddy',
  ['run', '--config', `/etc/caddy/${caddyFileName}`, '--adapter', 'caddyfile'],
  'App/Admin Dashboard Caddy'
);

caddyProcess.on('exit', (code) => {
  console.log(`Exiting process because Caddy Server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, exiting...');

  caddyProcess.kill('SIGINT');

  process.exit(0);
});
