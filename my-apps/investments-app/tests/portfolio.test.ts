import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePortfolio, validateHolding } from '../src/lib/portfolio';

test('calculates cost basis, current value, and unrealized P&L', () => {
  const summary = calculatePortfolio([
    { symbol: 'AAPL', name: 'Apple Inc.', quantity: 4, averagePrice: 100 },
    { symbol: 'MSFT', name: 'Microsoft', quantity: 2, averagePrice: 200 },
  ], {
    AAPL: { symbol: 'AAPL', price: 125, change: 0, changePercent: 0, previousClose: 125, latestTradingDay: '2025-01-01', currency: 'USD' },
    MSFT: { symbol: 'MSFT', price: 180, change: 0, changePercent: 0, previousClose: 180, latestTradingDay: '2025-01-01', currency: 'USD' },
  });
  assert.equal(summary.totalInvested, 800);
  assert.equal(summary.totalValue, 860);
  assert.equal(summary.unrealizedPnl, 60);
  assert.equal(summary.unrealizedPnlPercent, 7.5);
  assert.equal(summary.holdings[0].unrealizedPnl, 100);
});

test('excludes missing quotes from value and P&L but preserves total cost basis', () => {
  const summary = calculatePortfolio([{ symbol: 'AAPL', name: 'Apple', quantity: 2, averagePrice: 50 }], {});
  assert.equal(summary.totalInvested, 100);
  assert.equal(summary.totalValue, 0);
  assert.equal(summary.unrealizedPnl, 0);
  assert.equal(summary.holdings[0].price, null);
});

test('validates positive finite holding inputs', () => {
  assert.equal(validateHolding(3, 120), null);
  assert.match(validateHolding(0, 120) ?? '', /quantity/);
  assert.match(validateHolding(2, Number.NaN) ?? '', /price/);
});
