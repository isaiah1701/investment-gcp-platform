import type { WeatherCondition } from './weather-types';

export function celsiusToFahrenheit(value: number): number {
  return (value * 9) / 5 + 32;
}

export function displayTemperature(value: number, unit: 'C' | 'F'): number {
  return Math.round(unit === 'F' ? celsiusToFahrenheit(value) : value);
}

export function weatherCondition(code: number): WeatherCondition {
  if (code === 0) return { label: 'Clear sky', kind: 'sunny' };
  if (code === 1) return { label: 'Mainly clear', kind: 'sunny' };
  if (code === 2) return { label: 'Partly cloudy', kind: 'cloudy' };
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' };
  if ([45, 48].includes(code)) return { label: 'Foggy', kind: 'foggy' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: code >= 80 ? 'Rain showers' : 'Rain', kind: 'rainy' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', kind: 'snowy' };
  if (thunderstorms.includes(code)) return { label: 'Thunderstorms', kind: 'stormy' };
  return { label: 'Variable conditions', kind: 'cloudy' };
}

const thunderstorms = [95, 96, 99];

export function formatLocalHour(time: string, timezone: string): string {
  const date = new Date(time);
  if (Number.isNaN(date.valueOf())) return time.slice(11, 16) || time;
  return new Intl.DateTimeFormat('en', { hour: 'numeric', timeZone: timezone }).format(date);
}

export function formatLocalDay(date: string, timezone: string, today = false): string {
  if (today) return 'Today';
  const instant = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: timezone }).format(instant);
}

export function formatCityDateTime(time: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone,
  }).format(time);
}
