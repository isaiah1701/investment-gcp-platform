import { getMockWeather, mockLocations, searchMockLocations } from '@/data/mock-weather';
import { readFileSync } from 'node:fs';
import { recordWeatherApi } from './metrics';
import type { DailyForecast, HourlyForecast, WeatherLocation, WeatherReport } from './weather-types';

const WEATHER_API_URL = 'https://api.weatherapi.com/v1';
const REQUEST_TIMEOUT_MS = 8_000;

type JsonRecord = Record<string, unknown>;

export class WeatherServiceError extends Error {
  constructor(message: string, public readonly status = 502, public readonly providerCode?: number) {
    super(message);
    this.name = 'WeatherServiceError';
  }
}

export function weatherMode(): 'mock' | 'live' {
  return process.env.WEATHER_DATA_MODE?.toLowerCase() === 'live' ? 'live' : 'mock';
}

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WeatherServiceError('Weather service returned an invalid response.');
  }
  return value as JsonRecord;
}

function numberAt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WeatherServiceError(`Weather service returned invalid ${field}.`);
  }
  return value;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringAt(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value) throw new WeatherServiceError(`Weather service returned invalid ${field}.`);
  return value;
}

function weatherApiKey(): string {
  let key = process.env.WEATHER_API_KEY?.trim();
  if (!key) {
    try { key = readFileSync('/var/run/secrets/sky/weather-api-key', 'utf8').trim(); } catch { /* Local env remains the preferred source. */ }
  }
  if (!key) throw new WeatherServiceError('Add WEATHER_API_KEY to the root .env file to enable live weather.', 503);
  return key;
}

async function providerJson(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${WEATHER_API_URL}/${path}`);
  url.search = new URLSearchParams({ key: weatherApiKey(), ...params }).toString();
  let response: Response;
  const started = performance.now();
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 900 },
      headers: { accept: 'application/json' },
    });
  } catch {
    recordWeatherApi('failure', (performance.now() - started) / 1000);
    throw new WeatherServiceError('Weather service is temporarily unavailable. Try again in a moment.');
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WeatherServiceError('Weather service returned an unreadable response.');
  }
  if (!response.ok) {
    recordWeatherApi('failure', (performance.now() - started) / 1000);
    const error = record(payload).error;
    const code = error && typeof error === 'object' ? (error as JsonRecord).code : undefined;
    if (code === 1006) throw new WeatherServiceError('We couldn’t find that place. Try another city.', 404);
    if (code === 2006 || code === 2008) {
      throw new WeatherServiceError('WeatherAPI rejected the configured key. Check WEATHER_API_KEY in the root .env file.', 503);
    }
    if (code === 2007) throw new WeatherServiceError('The WeatherAPI monthly request quota has been reached.', 503);
    if (code === 2009) throw new WeatherServiceError('The requested forecast length is outside this WeatherAPI plan.', 403, 2009);
    throw new WeatherServiceError('Weather service could not load that forecast. Try again shortly.');
  }
  recordWeatherApi('success', (performance.now() - started) / 1000);
  return payload;
}

function normalizeLocation(value: unknown, idOverride?: string): WeatherLocation {
  const raw = record(value);
  const id = idOverride ?? `weatherapi:${numberAt(raw.id, 'location id')}`;
  const latitude = numberAt(raw.lat, 'latitude');
  const longitude = numberAt(raw.lon, 'longitude');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new WeatherServiceError('Weather service returned invalid location coordinates.');
  }
  return {
    id,
    name: stringAt(raw.name, 'location name'),
    country: stringAt(raw.country, 'country'),
    countryCode: typeof raw.country_code === 'string' ? raw.country_code : undefined,
    region: typeof raw.region === 'string' && raw.region ? raw.region : undefined,
    latitude,
    longitude,
    timezone: typeof raw.tz_id === 'string' && raw.tz_id ? raw.tz_id : 'UTC',
  };
}

export async function searchLocations(query: string): Promise<WeatherLocation[]> {
  const clean = query.trim().slice(0, 100);
  if (clean.length < 2) return [];
  if (weatherMode() === 'mock') return searchMockLocations(clean);
  const payload = await providerJson('search.json', { q: clean });
  if (!Array.isArray(payload)) return [];
  return payload.slice(0, 8).map((entry) => normalizeLocation(entry));
}

function providerConditionCode(value: unknown): number {
  const raw = record(value);
  return numberAt(raw.code, 'condition code');
}

// Translate WeatherAPI's condition codes to the WMO code set used by the UI.
function toWeatherCode(code: number): number {
  if (code === 1000) return 0;
  if (code === 1003) return 2;
  if ([1006, 1009].includes(code)) return 3;
  if ([1030, 1135, 1147].includes(code)) return 45;
  if ([1150, 1153, 1168, 1171].includes(code)) return 53;
  if ([1063, 1180, 1183, 1186, 1189].includes(code)) return 61;
  if ([1192, 1195, 1198, 1201, 1243, 1246].includes(code)) return 65;
  if ([1204, 1207, 1249, 1252].includes(code)) return 66;
  if ([1066, 1114, 1210, 1213, 1216, 1219, 1255, 1258].includes(code)) return 71;
  if ([1117, 1222, 1225, 1261, 1264].includes(code)) return 75;
  if ([1072, 1191, 1240].includes(code)) return 80;
  if ([1087, 1273, 1276].includes(code)) return 95;
  if ([1279, 1282].includes(code)) return 99;
  return 2;
}

function epochIso(value: unknown, field: string): string {
  return new Date(numberAt(value, field) * 1_000).toISOString();
}

function toHourlyForecast(value: unknown): HourlyForecast {
  const raw = record(value);
  return {
    time: epochIso(raw.time_epoch, 'hourly time'),
    temperature: numberAt(raw.temp_c, 'hourly temperature'),
    precipitationProbability: optionalNumber(raw.chance_of_rain),
    weatherCode: toWeatherCode(providerConditionCode(raw.condition)),
  };
}

function toDailyForecast(value: unknown): DailyForecast {
  const raw = record(value);
  const day = record(raw.day);
  const astro = record(raw.astro);
  return {
    date: stringAt(raw.date, 'forecast date'),
    weatherCode: toWeatherCode(providerConditionCode(day.condition)),
    temperatureMin: numberAt(day.mintemp_c, 'daily low'),
    temperatureMax: numberAt(day.maxtemp_c, 'daily high'),
    precipitationProbability: optionalNumber(day.daily_chance_of_rain),
    precipitation: optionalNumber(day.totalprecip_mm),
    uvIndex: optionalNumber(day.uv),
    sunrise: typeof astro.sunrise === 'string' ? astro.sunrise : null,
    sunset: typeof astro.sunset === 'string' ? astro.sunset : null,
  };
}

export async function getWeather(locationId: string): Promise<WeatherReport> {
  if (weatherMode() === 'mock') {
    const report = getMockWeather(locationId);
    if (!report) throw new WeatherServiceError('Choose a city from the search results.', 404);
    return report;
  }
  const match = /^weatherapi:(\d{1,12})$/.exec(locationId);
  if (!match) throw new WeatherServiceError('Choose a city from the search results.', 400);

  let forecastPayload: unknown;
  try {
    forecastPayload = await providerJson('forecast.json', {
      q: `id:${match[1]}`, days: '7', aqi: 'no', alerts: 'no',
    });
  } catch (error) {
    if (!(error instanceof WeatherServiceError) || error.providerCode !== 2009) throw error;
    forecastPayload = await providerJson('forecast.json', {
      q: `id:${match[1]}`, days: '3', aqi: 'no', alerts: 'no',
    });
  }
  const payload = record(forecastPayload);
  const location = normalizeLocation(payload.location, `weatherapi:${match[1]}`);
  const current = record(payload.current);
  const forecast = record(payload.forecast);
  if (!Array.isArray(forecast.forecastday) || forecast.forecastday.length === 0) {
    throw new WeatherServiceError('Weather service returned an incomplete forecast.');
  }
  const daily: DailyForecast[] = forecast.forecastday.map(toDailyForecast);
  const currentTime = epochIso(current.last_updated_epoch, 'current time');
  const hourly: HourlyForecast[] = forecast.forecastday
    .flatMap((day) => {
      const forecastDay = record(day);
      return Array.isArray(forecastDay.hour) ? forecastDay.hour.map(toHourlyForecast) : [];
    })
    .filter((hour) => hour.time >= currentTime)
    .slice(0, 48);
  if (hourly.length === 0) throw new WeatherServiceError('Weather service returned an incomplete hourly forecast.');

  return {
    location,
    current: {
      time: currentTime,
      temperature: numberAt(current.temp_c, 'current temperature'),
      feelsLike: numberAt(current.feelslike_c, 'feels-like temperature'),
      humidity: optionalNumber(current.humidity),
      windSpeed: optionalNumber(current.wind_kph),
      windGustSpeed: optionalNumber(current.gust_kph),
      visibility: optionalNumber(current.vis_km),
      cloudCover: optionalNumber(current.cloud),
      uvIndex: optionalNumber(current.uv),
      precipitation: optionalNumber(current.precip_mm),
      weatherCode: toWeatherCode(providerConditionCode(current.condition)),
      isDay: current.is_day === 1 || current.is_day === true,
      temperatureMin: daily[0].temperatureMin,
      temperatureMax: daily[0].temperatureMax,
    },
    hourly,
    daily: daily.slice(0, 7),
    units: { temperature: '°C', windSpeed: 'km/h', precipitation: 'mm' },
  };
}

export function getDefaultMockLocation(): WeatherLocation {
  return mockLocations[0];
}
