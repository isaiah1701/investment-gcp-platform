import assert from 'node:assert/strict';
import test from 'node:test';
import { recordWeatherApi, renderMetrics, withHttpMetrics } from '../src/lib/metrics';

test('records HTTP status and latency with bounded route labels', async () => {
  const request = new Request('https://sky.example/api/metrics-test', { method: 'GET' });
  const response = await withHttpMetrics('/metrics-test', request, async () => new Response('accepted', { status: 202 }));
  assert.equal(response.status, 202);
  const metrics = renderMetrics();
  assert.match(metrics, /sky_http_requests_total\{method="GET",route="\/metrics-test",status="202"\} 1/);
  assert.match(metrics, /sky_http_request_duration_seconds_bucket\{method="GET",route="\/metrics-test",le="\+Inf"\} 1/);
});

test('records WeatherAPI outcome and latency', () => {
  recordWeatherApi('success', 0.125);
  const metrics = renderMetrics();
  assert.match(metrics, /sky_weather_api_requests_total\{result="success"\} 1/);
  assert.match(metrics, /sky_weather_api_request_duration_seconds_count 1/);
});
