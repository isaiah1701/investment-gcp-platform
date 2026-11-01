import { NextResponse } from 'next/server';
import { withHttpMetrics } from '@/lib/metrics';

export function GET(request: Request) {
  return withHttpMetrics('/healthz', request, async () => NextResponse.json({ status: 'ok', service: 'sky' }));
}
