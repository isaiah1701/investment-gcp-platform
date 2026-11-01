import type { NextConfig } from 'next';
import { loadEnvConfig } from '@next/env';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The app lives under /app, while local secrets stay in the repository-root .env.
const rootEnv = resolve(process.cwd(), '..', '.env');
loadEnvConfig(existsSync(rootEnv) ? resolve(process.cwd(), '..') : process.cwd(), process.env.NODE_ENV !== 'production', console, true);

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
      ]
    }];
  }
};

export default nextConfig;
