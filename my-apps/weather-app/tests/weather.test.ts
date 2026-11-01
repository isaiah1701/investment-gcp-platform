import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET as locationsGet } from '../src/app/api/locations/route';
import { GET as weatherGet } from '../src/app/api/weather/route';
import { getMockWeather, searchMockLocations } from '../src/data/mock-weather';
import { celsiusToFahrenheit, displayTemperature, weatherCondition } from '../src/lib/weather-utils';

test('temperature conversion uses the standard Celsius/Fahrenheit formula', () => {
  assert.equal(celsiusToFahrenheit(0), 32);
  assert.equal(celsiusToFahrenheit(100), 212);
  assert.equal(displayTemperature(20, 'F'), 68);
  assert.equal(displayTemperature(20.4, 'C'), 20);
});

test('weather codes map to readable conditions and visual categories', () => {
  assert.deepEqual(weatherCondition(0), { label: 'Clear sky', kind: 'sunny' });
  assert.equal(weatherCondition(61).kind, 'rainy');
  assert.equal(weatherCondition(71).kind, 'snowy');
  assert.equal(weatherCondition(95).kind, 'stormy');
  assert.equal(weatherCondition(777).label, 'Variable conditions');
});

test('mock city search matches city, region, and country names', () => {
  assert.equal(searchMockLocations('tokyo')[0]?.id, 'mock:tokyo');
  assert.equal(searchMockLocations('California')[0]?.name, 'San Francisco');
  assert.equal(searchMockLocations('two characters').length, 0);
});

test('mock weather returns a complete, consistent report for known cities', () => {
  const report = getMockWeather('mock:london', new Date('2026-06-10T10:00:00Z'));
  assert.ok(report);
  assert.equal(report.location.name, 'London');
  assert.equal(report.units.temperature, '°C');
  assert.equal(report.hourly.length, 48);
  assert.equal(report.daily.length, 7);
  assert.ok(report.hourly.every((hour) => Number.isFinite(hour.temperature) && hour.precipitationProbability !== null));
  assert.ok(report.daily.every((day) => day.temperatureMin <= day.temperatureMax));
  assert.equal(getMockWeather('not-a-city'), null);
});

test('mock forecasts use timezone-aware hourly and daily data', () => {
  const report = getMockWeather('mock:tokyo', new Date('2026-06-10T10:00:00Z'));
  assert.ok(report);
  assert.equal(report.location.timezone, 'Asia/Tokyo');
  assert.equal(report.hourly[0].time, '2026-06-10T10:00:00.000Z');
  assert.equal(report.daily.length, 7);
});

test('locations API returns structured results and validates short queries', async () => {
  const response = await locationsGet(new NextRequest('http://localhost/api/locations?q=London'));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.locations));
  assert.equal(payload.locations[0].country, 'United Kingdom');
  const invalid = await locationsGet(new NextRequest('http://localhost/api/locations?q=a'));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'query_too_short');
});

test('weather API returns a normalized report and structured unknown-city errors', async () => {
  const response = await weatherGet(new NextRequest('http://localhost/api/weather?cityId=mock:london'));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.weather.location.name, 'London');
  assert.ok(Array.isArray(payload.weather.hourly));
  assert.ok(Array.isArray(payload.weather.daily));
  const invalid = await weatherGet(new NextRequest('http://localhost/api/weather?cityId=unknown'));
  assert.equal(invalid.status, 404);
  assert.equal((await invalid.json()).error.code, 'weather_unavailable');
});
