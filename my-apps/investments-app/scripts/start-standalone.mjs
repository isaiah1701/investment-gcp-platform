import { cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';

const appRoot = process.cwd();
loadEnvConfig(resolve(appRoot, '../..'), true, console, true);
const standalone = resolve(appRoot, '.next/standalone');
await access(resolve(standalone, 'server.js'), constants.R_OK);
await cp(resolve(appRoot, '.next/static'), resolve(standalone, '.next/static'), { recursive: true, force: true });
await cp(resolve(appRoot, 'public'), resolve(standalone, 'public'), { recursive: true, force: true });

const server = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  env: { ...process.env, HOSTNAME: process.env.HOSTNAME || '0.0.0.0' },
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.kill(signal));
server.once('error', (error) => { console.error('Failed to start the standalone Equity server.'); process.exitCode = 1; });
server.once('close', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
