import { readFileSync } from 'node:fs';
import { getMockHistory, getMockQuote, searchMockStocks } from '@/data/mock-market';
import { recordCache, recordProvider } from './metrics';
import type { DataMode, MarketEnvelope, StockSearchResult } from './types';

const API_URL = 'https://www.alphavantage.co/query';
const TIMEOUT_MS = 8_000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;
const TTL = { search: 60 * 60_000, quote: 5 * 60_000, history: 6 * 60 * 60_000 };
type ApiFunction = 'SYMBOL_SEARCH' | 'GLOBAL_QUOTE' | 'TIME_SERIES_DAILY';
type CacheEntry<T> = { data: T; fetchedAt: string; freshUntil: number; staleUntil: number };
const cache = new Map<string, CacheEntry<unknown>>();

export class MarketServiceError extends Error {
  constructor(message: string, public readonly status = 502, public readonly code = 'provider_error') {
    super(message);
    this.name = 'MarketServiceError';
  }
}

export function dataMode(): DataMode {
  const mode = process.env.INVESTMENT_DATA_MODE?.toLowerCase();
  return mode === 'live' ? 'live' : 'mock';
}

export function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(symbol);
}

function apiKey(): string {
  const direct = process.env.INVESTMENT_API_KEY?.trim();
  if (direct) return direct;
  const path = process.env.INVESTMENT_API_KEY_FILE || '/var/run/secrets/equity/investment-api-key';
  try {
    const fromFile = readFileSync(path, 'utf8').trim();
    if (fromFile) return fromFile;
  } catch { /* A local environment variable is preferred; missing production keys are reported below. */ }
  throw new MarketServiceError('Live market data is not configured. Add INVESTMENT_API_KEY to the repository-root .env file.', 503, 'missing_api_key');
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MarketServiceError('Alpha Vantage returned an invalid response.');
  return value as Record<string, unknown>;
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function positiveNumber(value: unknown, field: string): number {
  const raw = text(value);
  const num = Number(raw);
  if (!raw || !Number.isFinite(num) || num <= 0) throw new MarketServiceError(`Alpha Vantage returned invalid ${field}.`);
  return num;
}

function providerMessage(payload: Record<string, unknown>): string | null {
  const message = text(payload.Note) || text(payload.Information) || text(payload['Error Message']);
  return message || null;
}

async function providerRequest(fn: ApiFunction, params: Record<string, string>): Promise<Record<string, unknown>> {
  const started = performance.now();
  const url = new URL(API_URL);
  url.search = new URLSearchParams({ function: fn, ...params, apikey: apiKey() }).toString();
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' }, cache: 'no-store' });
  } catch (error) {
    recordProvider(fn, 'error', (performance.now() - started) / 1000);
    if (error instanceof Error && error.name === 'TimeoutError') throw new MarketServiceError('Alpha Vantage timed out. Try again shortly.', 504, 'provider_timeout');
    throw new MarketServiceError('Alpha Vantage is temporarily unavailable. Try again shortly.', 502, 'provider_unavailable');
  }
  let payload: Record<string, unknown>;
  try { payload = object(await response.json()); } catch { recordProvider(fn, 'error', (performance.now() - started) / 1000); throw new MarketServiceError('Alpha Vantage returned an unreadable response.'); }
  const message = providerMessage(payload);
  if (!response.ok || message) {
    recordProvider(fn, 'error', (performance.now() - started) / 1000);
    if (message && /call frequency|requests per day|rate limit|premium/i.test(message)) {
      throw new MarketServiceError('Alpha Vantage limit reached or this data requires a premium plan. Cached data may still be available.', 429, 'provider_limit');
    }
    if (message && /invalid api call|symbol/i.test(message)) throw new MarketServiceError('That ticker was not found by Alpha Vantage.', 404, 'symbol_not_found');
    if (response.status === 401 || response.status === 403) throw new MarketServiceError('Alpha Vantage rejected the configured API key.', 503, 'invalid_api_key');
    throw new MarketServiceError('Alpha Vantage could not provide this data right now.', 502, 'provider_error');
  }
  recordProvider(fn, 'success', (performance.now() - started) / 1000);
  return payload;
}

async function cached<T>(key: string, kind: 'search' | 'quote' | 'history', loader: () => Promise<T>): Promise<MarketEnvelope<T>> {
  const mode = dataMode();
  const fullKey = `${mode}:${key}`;
  const now = Date.now();
  const existing = cache.get(fullKey) as CacheEntry<T> | undefined;
  if (existing && existing.freshUntil > now) {
    recordCache(kind, 'hit');
    return { data: existing.data, mode, fetchedAt: existing.fetchedAt, stale: false };
  }
  recordCache(kind, 'miss');
  try {
    const data = await loader();
    const fetchedAt = new Date().toISOString();
    cache.set(fullKey, { data, fetchedAt, freshUntil: now + TTL[kind], staleUntil: now + STALE_TTL_MS });
    return { data, mode, fetchedAt, stale: false };
  } catch (error) {
    if (existing && existing.staleUntil > now) {
      recordCache(kind, 'stale');
      return { data: existing.data, mode, fetchedAt: existing.fetchedAt, stale: true };
    }
    throw error;
  }
}

function parseSearch(payload: Record<string, unknown>): StockSearchResult[] {
  const matches = payload.bestMatches;
  if (!Array.isArray(matches)) return [];
  return matches.slice(0, 20).map((value) => {
    const item = object(value);
    return {
      symbol: text(item['1. symbol']).toUpperCase(),
      name: text(item['2. name']),
      region: text(item['4. region']),
      exchange: text(item['8. currency']) || 'US market',
      type: text(item['3. type']),
      matchScore: Number(text(item['9. matchScore'])) || 0,
    };
  }).filter((item) => isValidSymbol(item.symbol) && item.name && item.region === 'United States' && item.type.toLowerCase().includes('equity'))
    .slice(0, 8);
}

export async function searchStocks(query: string) {
  const clean = query.trim().slice(0, 80);
  if (clean.length < 2) return { data: [] as StockSearchResult[], mode: dataMode(), fetchedAt: new Date().toISOString(), stale: false };
  return cached(`search:${clean.toLowerCase()}`, 'search', async () => {
    if (dataMode() === 'mock') return searchMockStocks(clean);
    const payload = await providerRequest('SYMBOL_SEARCH', { keywords: clean });
    return parseSearch(payload);
  });
}

export async function getQuote(symbol: string) {
  return cached(`quote:${symbol}`, 'quote', async () => {
    if (dataMode() === 'mock') {
      const quote = getMockQuote(symbol);
      if (!quote) throw new MarketServiceError('Ticker is not in the mock market-data set. Search AAPL, MSFT, NVDA, GOOGL, AMZN, JPM or TSLA.', 404, 'symbol_not_found');
      return quote;
    }
    const payload = await providerRequest('GLOBAL_QUOTE', { symbol });
    const raw = object(payload['Global Quote']);
    if (!text(raw['01. symbol'])) throw new MarketServiceError('Alpha Vantage returned no quote for that ticker.', 404, 'symbol_not_found');
    const price = positiveNumber(raw['05. price'], 'price');
    const rawChange = text(raw['09. change']);
    const rawChangePercent = text(raw['10. change percent']).replace('%', '');
    const change = Number(rawChange);
    const changePercent = Number(rawChangePercent);
    const previousClose = positiveNumber(raw['08. previous close'], 'previous close');
    if (!rawChange || !rawChangePercent || ![change, changePercent].every(Number.isFinite)) throw new MarketServiceError('Alpha Vantage returned invalid price movement.');
    return {
      symbol,
      price,
      change,
      changePercent,
      previousClose,
      latestTradingDay: text(raw['07. latest trading day']),
      currency: 'USD' as const,
    };
  });
}

export async function getHistory(symbol: string) {
  return cached(`history:${symbol}`, 'history', async () => {
    if (dataMode() === 'mock') return getMockHistory(symbol);
    const payload = await providerRequest('TIME_SERIES_DAILY', { symbol, outputsize: 'compact' });
    const seriesName = Object.keys(payload).find((key) => key.startsWith('Time Series'));
    if (!seriesName || !payload[seriesName] || typeof payload[seriesName] !== 'object') {
      throw new MarketServiceError('Alpha Vantage did not return daily history for this ticker.', 404, 'history_unavailable');
    }
    const series = object(payload[seriesName]);
    return Object.entries(series).map(([date, value]) => ({ date, close: positiveNumber(object(value)['4. close'], 'daily close') }))
      .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}

export function clearMarketCacheForTests() { cache.clear(); }
