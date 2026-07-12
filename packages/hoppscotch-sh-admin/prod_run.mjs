#!/usr/local/bin/node
import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';

// Compose passes undefined host vars through as ""; treat empty as unset so the
// Caddyfile default (:80) applies.
if (process.env.HOPP_ALTERNATE_PORT === '') delete process.env.HOPP_ALTERNATE_PORT;

// Caddy bind port — when set, must be a bindable integer (root may bind any port;
// other UIDs can't bind below 1024).
const RESERVED_PORTS = ['3100'];
const MIN_PORT = process.getuid?.() === 0 ? 1 : 1024;
const altPort = process.env.HOPP_ALTERNATE_PORT;
if (altPort !== undefined) {
  if (!(/^[0-9]+$/.test(altPort) && +altPort >= MIN_PORT && +altPort <= 65535)) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is invalid: use an integer in ${MIN_PORT}-65535 (e.g. 8000)${MIN_PORT > 1 ? ' — ports below 1024 need root' : ''}.`);
    process.exit(1);
  }
  if (RESERVED_PORTS.includes(String(+altPort))) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is already used by this image (${RESERVED_PORTS.join(', ')}); pick another port (e.g. 8000).`);
    process.exit(1);
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

// Write to a temp dir (not cwd) so a non-root UID needn't own the working directory.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hopp-env-'));
const buildEnvPath = path.join(tmpDir, 'build.env');

try {
  fs.writeFileSync(buildEnvPath, envFileContent);
  // Call the global binary directly (not npx, which needs a writable $HOME cache).
  execFileSync('import-meta-env', ['-x', buildEnvPath, '-e', buildEnvPath, '-p', '/site/**/*'], { stdio: 'inherit' });
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

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
