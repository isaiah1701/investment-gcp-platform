import { withHttpMetrics } from '@/lib/metrics';

export function GET(request: Request) {
  return withHttpMetrics('/readyz', request, async () => Response.json({ status: 'ready', service: 'equity' }));
}
