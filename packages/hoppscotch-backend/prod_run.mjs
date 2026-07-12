#!/usr/local/bin/node
// @ts-check

import { spawn } from 'child_process';
import process from 'process';

// Compose passes undefined host vars through as ""; treat empty as unset so the
// Caddyfile default (:80) applies.
if (process.env.HOPP_ALTERNATE_PORT === '') delete process.env.HOPP_ALTERNATE_PORT;

// Caddy bind port — when set, must be a bindable integer (root may bind any port;
// other UIDs can't bind below 1024).
const RESERVED_PORTS = ['3170', '8080'];
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
    console.error('error');
    console.error(stuff);
  });

  return childProcess;
}

const caddyProcess = runChildProcessWithPrefix(
  'caddy',
  ['run', '--config', '/etc/caddy/backend.Caddyfile', '--adapter', 'caddyfile'],
  'App/Admin Dashboard Caddy',
);
const backendProcess = runChildProcessWithPrefix(
  'node',
  ['/dist/backend/dist/src/main.js'],
  'Backend Server',
);

caddyProcess.on('exit', (code) => {
  console.log(`Exiting process because Caddy Server exited with code ${code}`);
  process.exit(code);
});

backendProcess.on('exit', (code) => {
  console.log(
    `Exiting process because Backend Server exited with code ${code}`,
  );
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, exiting...');

  caddyProcess.kill('SIGINT');
  backendProcess.kill('SIGINT');

  process.exit(0);
});
