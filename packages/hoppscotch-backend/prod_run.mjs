#!/usr/local/bin/node
// @ts-check

import { spawn } from 'child_process';
import process from 'process';

// Guard: `HOPP_ALTERNATE_PORT` is the port Caddy binds to. It must not collide with
// a port already used by an internal service (backend 8080) or a fixed secondary port
// the Caddy config also binds (3170). Otherwise Caddy dies with a cryptic "address
// already in use" error and the container crash-loops. Fail fast with a clear message.
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
