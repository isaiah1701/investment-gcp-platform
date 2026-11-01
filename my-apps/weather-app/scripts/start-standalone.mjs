import { cp, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const root = process.cwd();
const repositoryRoot = resolve(root, '..');
loadEnvConfig(existsSync(resolve(repositoryRoot, '.env')) ? repositoryRoot : root, true, console, true);
const standalone = resolve(root, '.next/standalone');

await access(resolve(standalone, 'server.js'), constants.R_OK);
await cp(resolve(root, '.next/static'), resolve(standalone, '.next/static'), {
  recursive: true,
  force: true,
});
await cp(resolve(root, 'public'), resolve(standalone, 'public'), {
  recursive: true,
  force: true,
});

const server = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  env: { ...process.env, HOSTNAME: process.env.HOSTNAME || '0.0.0.0' },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.kill(signal));
}

server.once('error', (error) => {
  console.error('Failed to start the standalone Next.js server:', error);
  process.exitCode = 1;
});
server.once('close', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
