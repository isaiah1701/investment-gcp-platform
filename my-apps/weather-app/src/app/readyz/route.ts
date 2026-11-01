import { NextResponse } from 'next/server';
import { withHttpMetrics } from '@/lib/metrics';

export function GET(request: Request) {
  return withHttpMetrics('/readyz', request, async () => NextResponse.json({ status: 'ready', service: 'sky' }));
}
