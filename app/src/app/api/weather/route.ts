import { NextRequest, NextResponse } from 'next/server';
import { getWeather, WeatherServiceError } from '@/lib/weather-service';
import { withHttpMetrics } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  return withHttpMetrics('/api/weather', request, async () => {
    const cityId = request.nextUrl.searchParams.get('cityId') ?? '';
    if (!cityId || cityId.length > 40) {
      return NextResponse.json({ error: { code: 'invalid_city', message: 'Choose a city from search.' } }, { status: 400 });
    }
    try {
      return NextResponse.json({ weather: await getWeather(cityId) });
    } catch (error) {
      const serviceError = error instanceof WeatherServiceError ? error : new WeatherServiceError('Weather is temporarily unavailable.');
      return NextResponse.json({ error: { code: 'weather_unavailable', message: serviceError.message } }, { status: serviceError.status });
    }
  });
}
