import type { DailyForecast, HourlyForecast, WeatherLocation, WeatherReport } from '@/lib/weather-types';

export const mockLocations: WeatherLocation[] = [
  { id: 'mock:london', name: 'London', country: 'United Kingdom', countryCode: 'GB', region: 'England', latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London' },
  { id: 'mock:new-york', name: 'New York', country: 'United States', countryCode: 'US', region: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { id: 'mock:tokyo', name: 'Tokyo', country: 'Japan', countryCode: 'JP', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'mock:reykjavik', name: 'Reykjavik', country: 'Iceland', countryCode: 'IS', latitude: 64.1466, longitude: -21.9426, timezone: 'Atlantic/Reykjavik' },
  { id: 'mock:sydney', name: 'Sydney', country: 'Australia', countryCode: 'AU', region: 'New South Wales', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'mock:cape-town', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', latitude: -33.9249, longitude: 18.4241, timezone: 'Africa/Johannesburg' },
  { id: 'mock:san-francisco', name: 'San Francisco', country: 'United States', countryCode: 'US', region: 'California', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles' },
  { id: 'mock:paris', name: 'Paris', country: 'France', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { id: 'mock:dubai', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
];

const climates: Record<string, { temperature: number; code: number; humidity: number; wind: number; uv: number }> = {
  'mock:london': { temperature: 16, code: 2, humidity: 67, wind: 13, uv: 3 },
  'mock:new-york': { temperature: 21, code: 1, humidity: 54, wind: 10, uv: 5 },
  'mock:tokyo': { temperature: 24, code: 0, humidity: 62, wind: 8, uv: 6 },
  'mock:reykjavik': { temperature: 8, code: 3, humidity: 76, wind: 21, uv: 2 },
  'mock:sydney': { temperature: 23, code: 1, humidity: 58, wind: 15, uv: 7 },
  'mock:cape-town': { temperature: 19, code: 2, humidity: 61, wind: 18, uv: 5 },
  'mock:san-francisco': { temperature: 18, code: 45, humidity: 73, wind: 12, uv: 4 },
  'mock:paris': { temperature: 17, code: 61, humidity: 72, wind: 9, uv: 3 },
  'mock:dubai': { temperature: 31, code: 0, humidity: 39, wind: 11, uv: 8 },
};

function dateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function searchMockLocations(query: string): WeatherLocation[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  return mockLocations.filter((location) =>
    [location.name, location.country, location.region, location.countryCode]
      .filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(needle)),
  ).slice(0, 6);
}

export function getMockWeather(locationId: string, now = new Date()): WeatherReport | null {
  const location = mockLocations.find((item) => item.id === locationId);
  if (!location) return null;
  const climate = climates[location.id] ?? climates['mock:london'];
  const roundedNow = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
  const hourly: HourlyForecast[] = Array.from({ length: 168 }, (_, index) => {
    const instant = new Date(roundedNow + index * 3_600_000);
    const hour = Number(new Intl.DateTimeFormat('en', { hour: '2-digit', hourCycle: 'h23', timeZone: location.timezone }).format(instant));
    const wave = Math.sin(((hour - 8) / 24) * Math.PI * 2) * 3.4;
    const weatherCode = index < 9 ? climate.code : [0, 1, 2, 3, 61, 2, 1][(index + location.id.length) % 7];
    const wet = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
    return {
      time: instant.toISOString(),
      temperature: Math.round((climate.temperature + wave + Math.sin(index / 5) * 1.1) * 10) / 10,
      precipitationProbability: wet ? 24 + ((index * 13) % 58) : (index * 7) % 16,
      weatherCode,
    };
  });
  const grouped = new Map<string, HourlyForecast[]>();
  for (const hour of hourly) {
    const key = dateKey(new Date(hour.time), location.timezone);
    grouped.set(key, [...(grouped.get(key) ?? []), hour]);
  }
  const daily: DailyForecast[] = [...grouped.entries()].slice(0, 7).map(([date, hours], index) => ({
    date,
    weatherCode: index === 0 ? climate.code : hours[Math.min(14, hours.length - 1)]?.weatherCode ?? climate.code,
    temperatureMin: Math.min(...hours.map((hour) => hour.temperature)) - (index ? 1 : 0),
    temperatureMax: Math.max(...hours.map((hour) => hour.temperature)) + (index ? 1 : 0),
    precipitationProbability: Math.max(...hours.map((hour) => hour.precipitationProbability ?? 0)),
  }));
  const currentHour = hourly[0];
  const localHour = Number(new Intl.DateTimeFormat('en', { hour: '2-digit', hourCycle: 'h23', timeZone: location.timezone }).format(now));
  return {
    location,
    current: {
      time: now.toISOString(), temperature: currentHour.temperature,
      feelsLike: currentHour.temperature - (climate.wind > 16 ? 2 : 0.5), humidity: climate.humidity,
      windSpeed: climate.wind, uvIndex: climate.uv, precipitation: climate.code === 61 ? 0.4 : 0,
      weatherCode: climate.code, isDay: localHour >= 6 && localHour < 19,
      temperatureMin: daily[0].temperatureMin, temperatureMax: daily[0].temperatureMax,
    },
    hourly: hourly.slice(0, 48), daily,
    units: { temperature: '°C', windSpeed: 'km/h', precipitation: 'mm' },
  };
}
