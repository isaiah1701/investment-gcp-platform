import assert from 'node:assert/strict';
import test from 'node:test';
import { clearMarketCacheForTests, getHistory, getQuote, isValidSymbol, MarketServiceError, searchStocks } from '../src/lib/market-service';

const originalFetch = globalThis.fetch;
const originalMode = process.env.INVESTMENT_DATA_MODE;
const originalKey = process.env.INVESTMENT_API_KEY;
const originalKeyFile = process.env.INVESTMENT_API_KEY_FILE;

function setLive() {
  process.env.INVESTMENT_DATA_MODE = 'live';
  process.env.INVESTMENT_API_KEY = 'unit-test-key';
  process.env.INVESTMENT_API_KEY_FILE = '/not/a/real/key';
  clearMarketCacheForTests();
}

test.after(() => {
  globalThis.fetch = originalFetch;
  if (originalMode === undefined) delete process.env.INVESTMENT_DATA_MODE; else process.env.INVESTMENT_DATA_MODE = originalMode;
  if (originalKey === undefined) delete process.env.INVESTMENT_API_KEY; else process.env.INVESTMENT_API_KEY = originalKey;
  if (originalKeyFile === undefined) delete process.env.INVESTMENT_API_KEY_FILE; else process.env.INVESTMENT_API_KEY_FILE = originalKeyFile;
  clearMarketCacheForTests();
});

test('defaults to labelled mock mode and serves mock search, quote, and daily history', async () => {
  process.env.INVESTMENT_DATA_MODE = 'mock';
  clearMarketCacheForTests();
  const search = await searchStocks('apple');
  const quote = await getQuote('AAPL');
  const history = await getHistory('AAPL');
  assert.equal(search.mode, 'mock');
  assert.equal(search.data[0].symbol, 'AAPL');
  assert.equal(quote.data.currency, 'USD');
  assert.equal(quote.mode, 'mock');
  assert.ok(history.data.length > 20);
  assert.equal(history.mode, 'mock');
});

test('validates ticker input before provider calls', () => {
  assert.equal(isValidSymbol('BRK.B'), true);
  assert.equal(isValidSymbol('aapl'), false);
  assert.equal(isValidSymbol('AAPL/../../x'), false);
  assert.equal(isValidSymbol(''), false);
});

test('parses Alpha Vantage symbol search and filters results to US equities', async () => {
  setLive();
  let requested = '';
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requested = String(input);
    return Response.json({ bestMatches: [
      { '1. symbol': 'AAPL', '2. name': 'Apple Inc.', '3. type': 'Equity', '4. region': 'United States', '8. currency': 'USD', '9. matchScore': '1.0000' },
      { '1. symbol': 'TSCO.LON', '2. name': 'Tesco PLC', '3. type': 'Equity', '4. region': 'United Kingdom', '8. currency': 'GBP', '9. matchScore': '0.9000' },
    ] });
  }) as typeof fetch;
  const result = await searchStocks('apple & co');
  assert.equal(result.mode, 'live');
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].symbol, 'AAPL');
  assert.ok(requested.includes('keywords=apple+%26+co'));
  assert.ok(requested.includes('apikey=unit-test-key'));
});

test('parses Global Quote, caches it, and labels daily close as the latest available quote', async () => {
  setLive();
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json({ 'Global Quote': { '01. symbol': 'AAPL', '05. price': '123.45', '07. latest trading day': '2026-10-30', '08. previous close': '122.45', '09. change': '1.00', '10. change percent': '0.8167%' } });
  }) as typeof fetch;
  const first = await getQuote('AAPL');
  const second = await getQuote('AAPL');
  assert.equal(first.data.price, 123.45);
  assert.equal(first.data.latestTradingDay, '2026-10-30');
  assert.equal(first.mode, 'live');
  assert.equal(first.stale, false);
  assert.equal(second.fetchedAt, first.fetchedAt);
  assert.equal(calls, 1);
});

test('parses compact daily history', async () => {
  setLive();
  globalThis.fetch = (async () => Response.json({ 'Meta Data': { '3. Last Refreshed': '2026-10-30' }, 'Time Series (Daily)': {
    '2026-10-30': { '4. close': '103.75' }, '2026-10-29': { '4. close': '102.50' },
  } })) as typeof fetch;
  const result = await getHistory('AAPL');
  assert.deepEqual(result.data, [{ date: '2026-10-29', close: 102.5 }, { date: '2026-10-30', close: 103.75 }]);
});

test('reports provider rate limiting without substituting demo prices', async () => {
  setLive();
  globalThis.fetch = (async () => Response.json({ Note: 'API call frequency is 25 requests per day.' })) as typeof fetch;
  await assert.rejects(getQuote('AAPL'), (error: unknown) => error instanceof MarketServiceError && error.status === 429 && error.code === 'provider_limit');
});

test('reports missing API key without calling Alpha Vantage', async () => {
  setLive();
  delete process.env.INVESTMENT_API_KEY;
  let called = false;
  globalThis.fetch = (async () => { called = true; return Response.json({}); }) as typeof fetch;
  await assert.rejects(getQuote('MSFT'), (error: unknown) => error instanceof MarketServiceError && error.code === 'missing_api_key');
  assert.equal(called, false);
});

test('handles upstream timeouts', async () => {
  setLive();
  globalThis.fetch = (async () => { throw new DOMException('timed out', 'TimeoutError'); }) as typeof fetch;
  await assert.rejects(getQuote('NVDA'), (error: unknown) => error instanceof MarketServiceError && error.status === 504 && error.code === 'provider_timeout');
});

test('serves an explicitly marked stale quote after a provider failure', async () => {
  setLive();
  const originalNow = Date.now;
  let now = 1_800_000_000_000;
  Date.now = () => now;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls > 1) return Response.json({ Note: 'API call frequency limit reached.' });
    return Response.json({ 'Global Quote': { '01. symbol': 'AAPL', '05. price': '120', '07. latest trading day': '2026-10-30', '08. previous close': '119', '09. change': '1', '10. change percent': '0.8403%' } });
  }) as typeof fetch;
  try {
    const first = await getQuote('AAPL');
    now += 5 * 60_000 + 1;
    const stale = await getQuote('AAPL');
    assert.equal(first.stale, false);
    assert.equal(stale.stale, true);
    assert.equal(stale.data.price, 120);
  } finally { Date.now = originalNow; }
});
