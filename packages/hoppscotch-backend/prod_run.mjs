#!/usr/local/bin/node
// @ts-check

import { spawn } from 'child_process';
import net from 'net';
import process from 'process';

// Probe the real bind so the kernel decides (CAP_NET_BIND_SERVICE, port sysctls),
// not a UID guess.
async function assertPortBindable(port) {
  await new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', (err) => {
      if (err.code === 'EACCES') {
        console.error(`Cannot bind port ${port} as the current user: set HOPP_ALTERNATE_PORT to a free port >= 1024, or run as root / grant CAP_NET_BIND_SERVICE.`);
        process.exit(1);
      }
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use inside the container: set HOPP_ALTERNATE_PORT to a free port.`);
        process.exit(1);
      }
      console.warn(`Skipping bind preflight for port ${port} (${err.code})`);
      resolve();
    });
    probe.listen(port, () => probe.close(resolve));
  });
}

// Empty means unset (compose passes undefined vars as ""), so the :80 default applies.
if (process.env.HOPP_ALTERNATE_PORT === '') delete process.env.HOPP_ALTERNATE_PORT;

// Sanity-check the value; real bindability is probed below.
const RESERVED_PORTS = ['3170', '8080'];
const altPort = process.env.HOPP_ALTERNATE_PORT;
if (altPort !== undefined) {
  if (!(/^[0-9]+$/.test(altPort) && +altPort >= 1 && +altPort <= 65535)) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is invalid: use an integer in 1-65535 (e.g. 8000).`);
    process.exit(1);
  }
  if (RESERVED_PORTS.includes(String(+altPort))) {
    console.error(`HOPP_ALTERNATE_PORT="${altPort}" is already used by this image (${RESERVED_PORTS.join(', ')}); pick another port (e.g. 8000).`);
    process.exit(1);
  }
}

// Caddy always binds this port (env value or the :80 default).
await assertPortBindable(+(process.env.HOPP_ALTERNATE_PORT ?? 80));

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
  // code is null on signal death; report failure, not success.
  process.exit(code ?? 1);
});

backendProcess.on('exit', (code) => {
  console.log(
    `Exiting process because Backend Server exited with code ${code}`,
  );
  process.exit(code ?? 1);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, exiting...');

  caddyProcess.kill('SIGINT');
  backendProcess.kill('SIGINT');

  process.exit(0);
});
