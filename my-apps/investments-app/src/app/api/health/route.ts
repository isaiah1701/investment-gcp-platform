import { withHttpMetrics } from '@/lib/metrics';

export function GET(request: Request) {
  return withHttpMetrics('/api/health', request, async () => Response.json({ status: 'ok', service: 'equity' }));
}
