import { renderMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return new Response(renderMetrics(), { headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' } });
}
