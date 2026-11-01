type Histogram = { buckets: number[]; count: number; sum: number };
type Registry = {
  requests: Map<string, number>;
  requestLatency: Map<string, Histogram>;
  weatherRequests: Map<string, number>;
  weatherLatency: Histogram;
};

const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const registryKey = '__skyPrometheusMetrics';
const root = globalThis as typeof globalThis & { [registryKey]?: Registry };
const registry = root[registryKey] ??= {
  requests: new Map(), requestLatency: new Map(), weatherRequests: new Map(),
  weatherLatency: { buckets: Array(buckets.length).fill(0), count: 0, sum: 0 },
};

function observe(histogram: Histogram, seconds: number) {
  histogram.count += 1;
  histogram.sum += seconds;
  buckets.forEach((bound, index) => { if (seconds <= bound) histogram.buckets[index] += 1; });
}

export function recordWeatherApi(result: 'success' | 'failure', durationSeconds: number) {
  registry.weatherRequests.set(result, (registry.weatherRequests.get(result) ?? 0) + 1);
  observe(registry.weatherLatency, durationSeconds);
}

export async function withHttpMetrics(
  route: string,
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  const start = performance.now();
  let response: Response;
  try {
    response = await handler();
  } catch (error) {
    response = new Response('Internal server error', { status: 500 });
    throw error;
  } finally {
    const status = typeof response! === 'undefined' ? 500 : response.status;
    const key = `${request.method}|${route}|${status}`;
    registry.requests.set(key, (registry.requests.get(key) ?? 0) + 1);
    const latencyKey = `${request.method}|${route}`;
    const histogram = registry.requestLatency.get(latencyKey) ?? { buckets: Array(buckets.length).fill(0), count: 0, sum: 0 };
    observe(histogram, (performance.now() - start) / 1000);
    registry.requestLatency.set(latencyKey, histogram);
  }
  return response;
}

function escapeLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

function histogramLines(name: string, labels: string, histogram: Histogram): string[] {
  const labelSet = labels ? `{${labels}}` : '';
  return buckets.map((bound, index) => `${name}_bucket{${labels}${labels ? ',' : ''}le="${bound}"} ${histogram.buckets[index]}`)
    .concat(`${name}_bucket{${labels}${labels ? ',' : ''}le="+Inf"} ${histogram.count}`, `${name}_sum${labelSet} ${histogram.sum}`, `${name}_count${labelSet} ${histogram.count}`);
}

export function renderMetrics(): string {
  const lines = [
    '# HELP sky_http_requests_total HTTP requests served by Sky.',
    '# TYPE sky_http_requests_total counter',
  ];
  for (const [key, value] of registry.requests) {
    const [method, route, status] = key.split('|');
    lines.push(`sky_http_requests_total{method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${status}"} ${value}`);
  }
  lines.push('# HELP sky_http_request_duration_seconds HTTP request latency in seconds.', '# TYPE sky_http_request_duration_seconds histogram');
  for (const [key, histogram] of registry.requestLatency) {
    const [method, route] = key.split('|');
    lines.push(...histogramLines('sky_http_request_duration_seconds', `method="${escapeLabel(method)}",route="${escapeLabel(route)}"`, histogram));
  }
  lines.push('# HELP sky_weather_api_requests_total WeatherAPI requests by outcome.', '# TYPE sky_weather_api_requests_total counter');
  for (const [result, value] of registry.weatherRequests) lines.push(`sky_weather_api_requests_total{result="${result}"} ${value}`);
  lines.push('# HELP sky_weather_api_request_duration_seconds WeatherAPI request latency in seconds.', '# TYPE sky_weather_api_request_duration_seconds histogram');
  lines.push(...histogramLines('sky_weather_api_request_duration_seconds', '', registry.weatherLatency));
  return `${lines.join('\n')}\n`;
}
