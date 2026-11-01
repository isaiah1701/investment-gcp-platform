import { withHttpMetrics } from '@/lib/metrics';

export function GET(request: Request) {
  return withHttpMetrics('/api/ready', request, async () => Response.json({ status: 'ready', service: 'equity' }));
}
