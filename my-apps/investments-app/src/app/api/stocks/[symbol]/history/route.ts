import { withHttpMetrics } from '@/lib/metrics';
import { errorResponse } from '@/lib/http';
import { getHistory, isValidSymbol } from '@/lib/market-service';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ symbol: string }> };

export function GET(request: Request, context: Context) {
  return withHttpMetrics('/api/stocks/:symbol/history', request, async (requestId) => {
    const { symbol: rawSymbol } = await context.params;
    const symbol = rawSymbol.toUpperCase();
    if (!isValidSymbol(symbol)) return Response.json({ error: { code: 'invalid_symbol', message: 'Enter a valid stock ticker.', requestId } }, { status: 400 });
    try { return Response.json(await getHistory(symbol)); } catch (error) { return errorResponse(error, requestId); }
  });
}
