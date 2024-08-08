#!/usr/local/bin/node
// @ts-check

import { spawn } from 'child_process';
import process from 'process';

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
  ['/dist/backend/dist/main.js'],
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
