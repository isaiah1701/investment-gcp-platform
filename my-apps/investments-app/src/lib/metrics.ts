type Histogram = { buckets: number[]; count: number; sum: number };
type Registry = {
  http: Map<string, number>;
  httpLatency: Map<string, Histogram>;
  provider: Map<string, number>;
  providerLatency: Map<string, Histogram>;
  cache: Map<string, number>;
};

const bounds = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const registryKey = '__equityPrometheusMetrics';
const root = globalThis as typeof globalThis & { [registryKey]?: Registry };
const metrics = root[registryKey] ??= {
  http: new Map(), httpLatency: new Map(), provider: new Map(), providerLatency: new Map(), cache: new Map(),
};

function observe(histogram: Histogram, seconds: number) {
  histogram.count += 1;
  histogram.sum += seconds;
  bounds.forEach((bound, i) => { if (seconds <= bound) histogram.buckets[i] += 1; });
}

function histogramFor(map: Map<string, Histogram>, key: string) {
  const histogram = map.get(key) ?? { buckets: Array(bounds.length).fill(0) as number[], count: 0, sum: 0 };
  map.set(key, histogram);
  return histogram;
}

export function recordProvider(functionName: 'SYMBOL_SEARCH' | 'GLOBAL_QUOTE' | 'TIME_SERIES_DAILY', outcome: 'success' | 'error', seconds: number) {
  const key = `${functionName}|${outcome}`;
  metrics.provider.set(key, (metrics.provider.get(key) ?? 0) + 1);
  observe(histogramFor(metrics.providerLatency, functionName), seconds);
}

export function recordCache(kind: 'search' | 'quote' | 'history', result: 'hit' | 'miss' | 'stale') {
  const key = `${kind}|${result}`;
  metrics.cache.set(key, (metrics.cache.get(key) ?? 0) + 1);
}

function esc(value: string) { return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n'); }

function renderHistogram(name: string, labels: string, histogram: Histogram): string[] {
  const labelSet = labels ? `{${labels}}` : '';
  return bounds.map((bound, i) => `${name}_bucket{${labels}${labels ? ',' : ''}le="${bound}"} ${histogram.buckets[i]}`)
    .concat(`${name}_bucket{${labels}${labels ? ',' : ''}le="+Inf"} ${histogram.count}`, `${name}_sum${labelSet} ${histogram.sum}`, `${name}_count${labelSet} ${histogram.count}`);
}

export function renderMetrics() {
  const lines = ['# HELP equity_http_requests_total HTTP requests served by Equity.', '# TYPE equity_http_requests_total counter'];
  for (const [key, count] of metrics.http) {
    const [method, route, status] = key.split('|');
    lines.push(`equity_http_requests_total{method="${esc(method)}",route="${esc(route)}",status="${status}"} ${count}`);
  }
  lines.push('# HELP equity_http_request_duration_seconds HTTP request latency.', '# TYPE equity_http_request_duration_seconds histogram');
  for (const [route, histogram] of metrics.httpLatency) lines.push(...renderHistogram('equity_http_request_duration_seconds', `route="${esc(route)}"`, histogram));
  lines.push('# HELP equity_alpha_vantage_api_requests_total Alpha Vantage requests by function and outcome.', '# TYPE equity_alpha_vantage_api_requests_total counter');
  for (const [key, count] of metrics.provider) {
    const [fn, outcome] = key.split('|');
    lines.push(`equity_alpha_vantage_api_requests_total{function="${fn}",outcome="${outcome}"} ${count}`);
  }
  lines.push('# HELP equity_alpha_vantage_request_duration_seconds Alpha Vantage request latency.', '# TYPE equity_alpha_vantage_request_duration_seconds histogram');
  for (const [fn, histogram] of metrics.providerLatency) lines.push(...renderHistogram('equity_alpha_vantage_request_duration_seconds', `function="${fn}"`, histogram));
  lines.push('# HELP equity_market_cache_requests_total Market data cache requests.', '# TYPE equity_market_cache_requests_total counter');
  for (const [key, count] of metrics.cache) {
    const [cache, result] = key.split('|');
    lines.push(`equity_market_cache_requests_total{cache="${cache}",result="${result}"} ${count}`);
  }
  return `${lines.join('\n')}\n`;
}

export async function withHttpMetrics(route: string, request: Request, handler: (requestId: string) => Promise<Response>) {
  const start = performance.now();
  const fromHeader = request.headers.get('x-request-id') ?? '';
  const requestId = /^[A-Za-z0-9._-]{1,80}$/.test(fromHeader) ? fromHeader : crypto.randomUUID();
  let response: Response;
  try {
    response = await handler(requestId);
  } catch {
    response = Response.json({ error: { code: 'internal_error', message: 'Something went wrong.', requestId } }, { status: 500 });
  }
  const seconds = (performance.now() - start) / 1000;
  const requestKey = `${request.method}|${route}|${response.status}`;
  metrics.http.set(requestKey, (metrics.http.get(requestKey) ?? 0) + 1);
  observe(histogramFor(metrics.httpLatency, route), seconds);
  console.info(JSON.stringify({ event: 'http_request', requestId, method: request.method, route, status: response.status, durationMs: Math.round(seconds * 1000) }));
  const headers = new Headers(response.headers);
  headers.set('x-request-id', requestId);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
