import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as health } from '../src/app/healthz/route';
import { GET as ready } from '../src/app/readyz/route';
import { GET as badQuote } from '../src/app/api/stocks/[symbol]/quote/route';

test('health and readiness remain independent from Alpha Vantage', async () => {
  const healthy = await health(new Request('http://localhost/healthz'));
  const readyResponse = await ready(new Request('http://localhost/readyz'));
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), { status: 'ok', service: 'equity' });
  assert.equal(readyResponse.status, 200);
  assert.deepEqual(await readyResponse.json(), { status: 'ready', service: 'equity' });
});

test('rejects invalid ticker values before any provider request', async () => {
  const response = await badQuote(new Request('http://localhost/api/stocks/aapl%2F..%2Fx/quote'), { params: Promise.resolve({ symbol: 'aapl/../x' }) });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'invalid_symbol');
});
