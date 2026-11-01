import { MarketServiceError } from './market-service';

export function errorResponse(error: unknown, requestId: string) {
  if (error instanceof MarketServiceError) {
    return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status });
  }
  return Response.json({ error: { code: 'internal_error', message: 'The request could not be completed.', requestId } }, { status: 500 });
}
