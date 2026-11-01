import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import type { Quote, StockSearchResult } from '../src/lib/types';

const stock: StockSearchResult = { symbol: 'AAPL', name: 'Apple Inc.', region: 'United States', exchange: 'USD', type: 'Equity', matchScore: 1 };
const quote: Quote = { symbol: 'AAPL', price: 125, change: 2, changePercent: 1.63, previousClose: 123, latestTradingDay: '2026-10-30', currency: 'USD' };
let rtl: typeof import('@testing-library/react');

test.before(async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, configurable: true });
  Object.defineProperty(globalThis, 'MutationObserver', { value: dom.window.MutationObserver, configurable: true });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'ResizeObserver', { value: class {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe(target: Element) { this.callback([{ target, contentRect: { width: 640, height: 250, x: 0, y: 0, top: 0, left: 0, right: 640, bottom: 250, toJSON: () => ({}) } } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    unobserve() {}
    disconnect() {}
  }, configurable: true });
  rtl = await import('@testing-library/react');
});

test('searches stocks, persists a holding, edits/removes it, and manages a watchlist', async () => {
  const { Dashboard } = await import('../src/components/dashboard');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/stocks/search') return Response.json({ data: [stock], mode: 'mock', fetchedAt: new Date().toISOString(), stale: false });
    if (url.pathname.endsWith('/quote')) return Response.json({ data: quote, mode: 'mock', fetchedAt: new Date().toISOString(), stale: false });
    if (url.pathname.endsWith('/history')) return Response.json({ data: [{ date: '2026-10-29', close: 123 }, { date: '2026-10-30', close: 125 }], mode: 'mock', fetchedAt: new Date().toISOString(), stale: false });
    return Response.json({ error: { message: 'Not found' } }, { status: 404 });
  }) as typeof fetch;

  try {
    const view = rtl.render(<Dashboard />);
    await rtl.screen.findByText(/Demo mode/);
    await rtl.screen.findByText('Apple Inc.');

    rtl.fireEvent.click(rtl.screen.getByRole('button', { name: 'Add position' }));
    const dialog = rtl.screen.getByRole('dialog');
    rtl.fireEvent.change(rtl.within(dialog).getByLabelText('Share quantity'), { target: { value: '2' } });
    rtl.fireEvent.change(rtl.within(dialog).getByLabelText(/Average purchase price/), { target: { value: '100' } });
    rtl.fireEvent.click(rtl.within(dialog).getByRole('button', { name: 'Add to portfolio' }));
    await rtl.screen.findAllByText('$250.00');
    assert.deepEqual(JSON.parse(localStorage.getItem('equity.holdings.v1') || '[]'), [{ symbol: 'AAPL', name: 'Apple Inc.', quantity: 2, averagePrice: 100 }]);

    rtl.fireEvent.click(rtl.screen.getByRole('button', { name: 'Edit AAPL holding' }));
    const editDialog = rtl.screen.getByRole('dialog');
    rtl.fireEvent.change(rtl.within(editDialog).getByLabelText('Share quantity'), { target: { value: '3' } });
    rtl.fireEvent.click(rtl.within(editDialog).getByRole('button', { name: 'Save changes' }));
    await rtl.screen.findAllByText('$375.00');
    assert.equal(JSON.parse(localStorage.getItem('equity.holdings.v1') || '[]')[0].quantity, 3);

    rtl.fireEvent.click(rtl.screen.getByRole('button', { name: 'Add AAPL to watchlist' }));
    await rtl.screen.findByText('AAPL', { selector: '.watch-symbol' });
    assert.equal(JSON.parse(localStorage.getItem('equity.watchlist.v1') || '[]')[0].symbol, 'AAPL');
    rtl.fireEvent.click(rtl.within(rtl.screen.getByRole('region', { name: /Watchlist/ })).getByRole('button', { name: 'Remove AAPL from watchlist' }));
    await rtl.screen.findByText('Your watchlist is empty.');
    assert.deepEqual(JSON.parse(localStorage.getItem('equity.watchlist.v1') || '[]'), []);

    const search = rtl.screen.getByRole('combobox', { name: 'Search US stocks by company or ticker' });
    rtl.fireEvent.change(search, { target: { value: 'Apple' } });
    await rtl.screen.findByRole('option', { name: /AAPL.*Apple Inc/ });
    rtl.fireEvent.click(rtl.screen.getByRole('option', { name: /AAPL.*Apple Inc/ }));
    assert.equal(rtl.screen.getByRole('heading', { name: 'Apple Inc.' }).textContent, 'Apple Inc.');

    view.unmount();
    const reopened = rtl.render(<Dashboard />);
    await rtl.screen.findAllByText('$375.00');
    assert.equal(JSON.parse(localStorage.getItem('equity.holdings.v1') || '[]')[0].quantity, 3);
    rtl.fireEvent.click(rtl.screen.getByRole('button', { name: 'Remove AAPL holding' }));
    await rtl.screen.findByText(/Start with your first position/);
    assert.deepEqual(JSON.parse(localStorage.getItem('equity.holdings.v1') || '[]'), []);
    reopened.unmount();
  } finally {
    rtl.cleanup();
    globalThis.fetch = originalFetch;
  }
});
