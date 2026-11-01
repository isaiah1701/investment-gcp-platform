import { NextRequest, NextResponse } from 'next/server';
import { searchLocations, WeatherServiceError } from '@/lib/weather-service';
import { withHttpMetrics } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  return withHttpMetrics('/api/locations', request, async () => {
    const query = request.nextUrl.searchParams.get('q') ?? '';
    if (query.trim().length < 2) {
      return NextResponse.json({ error: { code: 'query_too_short', message: 'Enter at least two characters.' } }, { status: 400 });
    }
    try {
      return NextResponse.json({ locations: await searchLocations(query) });
    } catch (error) {
      const serviceError = error instanceof WeatherServiceError ? error : new WeatherServiceError('Location search is temporarily unavailable.');
      return NextResponse.json({ error: { code: 'location_search_failed', message: serviceError.message } }, { status: serviceError.status });
    }
  });
}
