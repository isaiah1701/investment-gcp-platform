import { withHttpMetrics, renderMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return withHttpMetrics('/metrics', request, async () => new Response(renderMetrics(), { headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' } }));
}
