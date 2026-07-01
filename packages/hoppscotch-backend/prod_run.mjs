#!/usr/local/bin/node
// @ts-check

import { spawn } from 'child_process';
import process from 'process';

// Caddy bind port — when set, must be an unprivileged integer (1024-65535).
const RESERVED_PORTS = ['3170', '8080'];
const altPort = process.env.HOPP_ALTERNATE_PORT;
if (altPort !== undefined) {
  if (!(/^[0-9]+$/.test(altPort) && +altPort >= 1024 && +altPort <= 65535)) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is invalid: use an integer in 1024-65535 (e.g. 8000).`);
    process.exit(1);
  }
  if (RESERVED_PORTS.includes(altPort)) {
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
