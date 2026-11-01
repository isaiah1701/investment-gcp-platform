import { withHttpMetrics } from '@/lib/metrics';
import { errorResponse } from '@/lib/http';
import { searchStocks } from '@/lib/market-service';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return withHttpMetrics('/api/stocks/search', request, async (requestId) => {
    const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (query.length > 80) return Response.json({ error: { code: 'invalid_query', message: 'Search text must be 80 characters or fewer.', requestId } }, { status: 400 });
    try { return Response.json(await searchStocks(query)); } catch (error) { return errorResponse(error, requestId); }
  });
}
