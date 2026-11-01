import { withHttpMetrics } from '@/lib/metrics';

export function GET(request: Request) {
  return withHttpMetrics('/healthz', request, async () => Response.json({ status: 'ok', service: 'equity' }));
}
