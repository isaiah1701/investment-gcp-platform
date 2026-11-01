'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CircleHelp, Clock3, Plus, RefreshCw, Star, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import type { Holding, HistoryPoint, MarketEnvelope, PortfolioSummary, Quote, StockSearchResult } from '@/lib/types';
import { calculatePortfolio } from '@/lib/portfolio';
import { EquitySearch } from './equity-search';
import { HoldingDialog } from './holding-dialog';
import { MarketChart } from './market-chart';

const startStock: StockSearchResult = { symbol: 'AAPL', name: 'Apple Inc.', region: 'United States', exchange: 'USD', type: 'Equity', matchScore: 1 };
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always', maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', signDisplay: 'always', maximumFractionDigits: 2 });
const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

async function api<T>(path: string): Promise<MarketEnvelope<T>> {
  const response = await fetch(path, { headers: { accept: 'application/json' } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || 'Market data could not be loaded.');
  return body as MarketEnvelope<T>;
}

function money(value: number) { return currency.format(Number.isFinite(value) ? value : 0); }
function signedMoney(value: number) { return signedCurrency.format(Number.isFinite(value) ? value : 0); }
function dayLabel(value: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function StatCard({ label, amount, note, icon, tone }: { label: string; amount: string; note: string; icon: React.ReactNode; tone?: 'positive' | 'negative' }) {
  return <article className="panel stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className="stat-value">{amount}</strong><span className={`stat-note ${tone ?? ''}`}>{note}</span></article>;
}

export function Dashboard() {
  const [activeStock, setActiveStock] = useState(startStock);
  const [selectedQuote, setSelectedQuote] = useState<MarketEnvelope<Quote> | null>(null);
  const [history, setHistory] = useState<MarketEnvelope<HistoryPoint[]> | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [selectedBusy, setSelectedBusy] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, MarketEnvelope<Quote> | undefined>>({});
  const [quoteIssues, setQuoteIssues] = useState<Record<string, string | undefined>>({});
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [watchlist, setWatchlist] = useState<StockSearchResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | undefined>();
  const [notice, setNotice] = useState('');
  const [lastRefresh, setLastRefresh] = useState('');

  useEffect(() => {
    try {
      const savedHoldings = JSON.parse(localStorage.getItem('equity.holdings.v1') || '[]') as unknown;
      const savedWatchlist = JSON.parse(localStorage.getItem('equity.watchlist.v1') || '[]') as unknown;
      setHoldings(asArray<Holding>(savedHoldings).filter((item) => item && /^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(item.symbol) && typeof item.name === 'string' && Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.averagePrice) && item.averagePrice > 0));
      setWatchlist(asArray<StockSearchResult>(savedWatchlist).filter((item) => item && /^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(item.symbol) && typeof item.name === 'string' && item.region === 'United States'));
    } catch { setNotice('Saved portfolio data could not be read. You can continue with a fresh portfolio.'); }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('equity.holdings.v1', JSON.stringify(holdings));
    localStorage.setItem('equity.watchlist.v1', JSON.stringify(watchlist));
  }, [hydrated, holdings, watchlist]);

  const loadSelected = useCallback(async (symbol: string, signal?: AbortSignal) => {
    setSelectedBusy(true); setQuoteError(''); setHistoryError('');
    const quoteRequest = api<Quote>(`/api/stocks/${encodeURIComponent(symbol)}/quote`).then((result) => {
      if (signal?.aborted) return;
      setSelectedQuote(result); setQuotes((previous) => ({ ...previous, [symbol]: result })); setLastRefresh(result.fetchedAt);
    }).catch((error: unknown) => {
      if (!signal?.aborted) setQuoteError(error instanceof Error ? error.message : 'Quote unavailable.');
    });
    const historyRequest = api<HistoryPoint[]>(`/api/stocks/${encodeURIComponent(symbol)}/history`).then((result) => {
      if (!signal?.aborted) setHistory(result);
    }).catch((error: unknown) => {
      if (!signal?.aborted) setHistoryError(error instanceof Error ? error.message : 'History unavailable.');
    });
    await Promise.all([quoteRequest, historyRequest]);
    if (!signal?.aborted) setSelectedBusy(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setSelectedQuote(null); setHistory(null);
    void loadSelected(activeStock.symbol, controller.signal);
    return () => controller.abort();
  }, [activeStock.symbol, loadSelected]);

  useEffect(() => {
    if (!hydrated) return;
    const symbols = [...new Set([...holdings.map((item) => item.symbol), ...watchlist.map((item) => item.symbol)])]
      .filter((symbol) => symbol !== activeStock.symbol).slice(0, 10);
    const controller = new AbortController();
    for (const symbol of symbols) {
      api<Quote>(`/api/stocks/${encodeURIComponent(symbol)}/quote`).then((result) => {
        if (!controller.signal.aborted) {
          setQuotes((previous) => ({ ...previous, [symbol]: result }));
          setQuoteIssues((previous) => ({ ...previous, [symbol]: undefined }));
        }
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setQuoteIssues((previous) => ({ ...previous, [symbol]: error instanceof Error ? error.message : 'Quote unavailable.' }));
      });
    }
    return () => controller.abort();
  }, [hydrated, holdings, watchlist, activeStock.symbol]);

  const summary: PortfolioSummary = useMemo(() => calculatePortfolio(holdings, Object.fromEntries(Object.entries(quotes).map(([symbol, item]) => [symbol, item?.data]))), [holdings, quotes]);
  const quote = selectedQuote?.data;
  const isDemo = selectedQuote?.mode === 'mock';
  const marketChange = quote?.change ?? 0;
  const missingPrices = summary.holdings.filter((item) => item.price === null).length;
  const existingWatch = watchlist.some((item) => item.symbol === activeStock.symbol);
  const watchQuote = (symbol: string) => quotes[symbol];
  const closeModal = useCallback(() => { setModalOpen(false); setEditing(undefined); }, []);

  function selectStock(stock: StockSearchResult) { setActiveStock(stock); }
  function toggleWatch(stock: StockSearchResult) {
    if (watchlist.some((item) => item.symbol === stock.symbol)) {
      setWatchlist((previous) => previous.filter((item) => item.symbol !== stock.symbol));
      setNotice(`${stock.symbol} removed from your watchlist.`);
    } else {
      setWatchlist((previous) => [...previous, stock].slice(0, 25));
      setNotice(`${stock.symbol} added to your watchlist.`);
    }
  }
  function saveHolding(holding: Holding) {
    setHoldings((previous) => [...previous.filter((item) => item.symbol !== holding.symbol), holding]);
    setModalOpen(false); setEditing(undefined); setNotice(`${holding.symbol} position saved.`);
    const current = quotes[holding.symbol];
    if (current) setQuotes((previous) => ({ ...previous, [holding.symbol]: current }));
  }
  function removeHolding(symbol: string) { setHoldings((previous) => previous.filter((item) => item.symbol !== symbol)); setNotice(`${symbol} removed from your portfolio.`); }
  function openAddHolding() { setEditing(holdings.find((item) => item.symbol === activeStock.symbol)); setModalOpen(true); }
  function refreshSelected() { void loadSelected(activeStock.symbol); }

  return <main className="dashboard-shell">
    <header className="topbar">
      <a className="brand" href="#overview" aria-label="Equity dashboard home"><span className="brand-mark"><TrendingUp size={19} strokeWidth={2.4} /></span><span><strong>equity</strong><small>PERSONAL PORTFOLIO</small></span></a>
      <div className="header-center"><EquitySearch onSelect={selectStock} /></div>
      <div className="header-meta"><span className={`data-mode ${selectedQuote?.mode === 'live' ? 'mode-live' : ''}`}><i />{selectedQuote?.mode === 'live' ? 'Live market data' : 'Demo data'}</span><span className="refresh-label"><Clock3 size={14} />{lastRefresh ? `Updated ${new Date(lastRefresh).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Awaiting data'}</span></div>
    </header>

    <div className="dashboard-content" id="overview">
      <div className="welcome-row"><div><span className="eyebrow">PORTFOLIO OVERVIEW</span><h1>Your investments, <span>in focus.</span></h1><p>Track positions and market prices in one clear view.</p></div><button className="button-secondary refresh-button" onClick={refreshSelected} disabled={selectedBusy}><RefreshCw size={15} className={selectedBusy ? 'spin' : ''} />Refresh {activeStock.symbol}</button></div>

      {isDemo && <div className="demo-banner"><CircleHelp size={16} /><span><strong>Demo mode</strong> — illustrative prices only. Add holdings to your browser; no data leaves this device.</span></div>}
      {notice && <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={14} /></button></div>}

      <section className="summary-grid" aria-label="Portfolio summary">
        <StatCard label="Portfolio value" amount={money(summary.totalValue)} note={summary.holdings.some((item) => quotes[item.symbol]?.stale) ? 'Includes stale cached quotes · USD' : holdings.length ? `${holdings.length} position${holdings.length === 1 ? '' : 's'} · USD` : 'No holdings yet · USD'} icon={<Wallet size={17} />} />
        <StatCard label="Total invested" amount={money(summary.totalInvested)} note="Cost basis across all positions" icon={<BriefcaseBusiness size={17} />} />
        <StatCard label="Unrealized P&L" amount={signedMoney(summary.unrealizedPnl)} note={`${percent.format(summary.unrealizedPnlPercent / 100)} on priced positions`} icon={<Activity size={17} />} tone={summary.unrealizedPnl > 0 ? 'positive' : summary.unrealizedPnl < 0 ? 'negative' : undefined} />
      </section>
      {missingPrices > 0 && <p className="inline-warning" role="status">{missingPrices} holding{missingPrices === 1 ? ' has' : 's have'} no current quote. Portfolio value and P&amp;L exclude unpriced positions.</p>}

      <div className="main-grid">
        <div className="primary-column">
          <section className="panel quote-panel" aria-labelledby="quote-title">
            <div className="quote-identity"><span className="ticker-large">{activeStock.symbol.slice(0, 1)}</span><div><span className="eyebrow">SELECTED STOCK</span><h2 id="quote-title">{activeStock.name}</h2><span className="company-meta">{activeStock.symbol} <i /> US equity · USD</span></div><button className={`icon-button watch-toggle ${existingWatch ? 'watched' : ''}`} type="button" aria-label={existingWatch ? `Remove ${activeStock.symbol} from watchlist` : `Add ${activeStock.symbol} to watchlist`} title={existingWatch ? 'Remove from watchlist' : 'Add to watchlist'} onClick={() => toggleWatch(activeStock)}><Star size={18} fill={existingWatch ? 'currentColor' : 'none'} /></button></div>
            <div className="quote-main">{quote ? <><div><span className="eyebrow">LATEST AVAILABLE CLOSE</span><p className="quote-price">{money(quote.price)}</p></div><div className={`quote-change ${marketChange >= 0 ? 'positive' : 'negative'}`}>{marketChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}<span>{signedMoney(marketChange)} ({percent.format(quote.changePercent / 100)})</span></div></> : <><div><span className="eyebrow">LATEST AVAILABLE CLOSE</span><p className="quote-price quote-placeholder">{selectedBusy ? 'Loading…' : '—'}</p></div>{quoteError && <p className="error-text quote-error" role="alert">{quoteError}</p>}</>}</div>
            {quote && <div className="quote-bottom"><span>As of {dayLabel(quote.latestTradingDay)}</span><span>{selectedQuote?.stale ? 'Stale cached quote' : selectedQuote?.mode === 'mock' ? 'Illustrative demo value' : 'End-of-day data · USD'}</span></div>}
            {!quote && quoteError && <p className="quote-help">Live mode never substitutes demo prices. Check your API key or provider quota.</p>}
            <div className="quote-actions"><button className="button-primary" onClick={openAddHolding} disabled={!quote}> <Plus size={16} />{holdings.some((item) => item.symbol === activeStock.symbol) ? 'Edit position' : 'Add position'}</button><span className="quote-note">Data may be delayed or end-of-day.</span></div>
          </section>
          <MarketChart symbol={activeStock.symbol} history={history} busy={selectedBusy} error={historyError} />
        </div>

        <aside className="side-column">
          <section className="panel watch-panel" aria-labelledby="watch-title"><div className="section-heading"><div><span className="eyebrow">YOUR LIST</span><h2 id="watch-title">Watchlist <span className="count-pill">{watchlist.length}</span></h2></div><Star size={16} className="subtle-icon" /></div>
            {watchlist.length === 0 ? <div className="empty-watch"><span className="empty-icon"><Star size={16} /></span><p>Your watchlist is empty.</p><small>Search a company and tap the star to keep it close.</small></div> : <ul className="watch-list">{watchlist.map((stock) => {
              const item = watchQuote(stock.symbol);
              return <li key={stock.symbol}><button className="watch-entry" onClick={() => selectStock(stock)}><span className="watch-symbol">{stock.symbol}</span><span className="watch-name">{stock.name}</span><span className="watch-price">{item ? money(item.data.price) : '—'}</span><span className={`watch-move ${item && item.data.change >= 0 ? 'positive' : item ? 'negative' : ''}`}>{item ? `${item.data.change >= 0 ? '+' : ''}${item.data.changePercent.toFixed(2)}%${item.stale ? ' · Stale' : ''}` : quoteIssues[stock.symbol] ? 'Unavailable' : 'Loading'}</span></button><button className="watch-remove icon-button" onClick={() => toggleWatch(stock)} aria-label={`Remove ${stock.symbol} from watchlist`}><X size={14} /></button></li>;
            })}</ul>}
            <div className="watch-footnote"><Clock3 size={13} />{watchlist.length > 0 ? 'Quotes refresh when you open the dashboard.' : 'Saved only in this browser.'}</div>
          </section>
          <section className="panel market-note"><div className="note-icon"><Activity size={17} /></div><div><h3>Market data</h3><p>US-listed equities · USD. Prices are end-of-day by default, not real-time.</p></div></section>
          <section className="panel privacy-note"><div className="note-icon muted"><Wallet size={17} /></div><div><h3>Private by design</h3><p>Holdings stay in this browser. Only ticker requests go to the market data provider.</p></div></section>
        </aside>
      </div>

      <section className="panel holdings-panel" aria-labelledby="holdings-title"><div className="section-heading holdings-heading"><div><span className="eyebrow">YOUR POSITIONS</span><h2 id="holdings-title">Holdings <span className="count-pill">{holdings.length}</span></h2></div><button className="button-secondary" onClick={openAddHolding} disabled={!quote}><Plus size={15} />Add holding</button></div>
        {holdings.length === 0 ? <div className="empty-holdings"><div className="empty-illustration"><BriefcaseBusiness size={23} /></div><div><h3>Start with your first position</h3><p>Add a stock, number of shares, and purchase price. Your calculations stay on this device.</p></div><button className="button-primary" onClick={openAddHolding} disabled={!quote}><Plus size={15} />Add {activeStock.symbol}</button></div> : <div className="table-scroll"><table className="holdings-table"><caption className="sr-only">Investment holdings and unrealized profit and loss in US dollars</caption><thead><tr><th scope="col">Company</th><th scope="col">Shares</th><th scope="col">Avg. cost</th><th scope="col">Latest</th><th scope="col">Market value</th><th scope="col">Unrealized P&amp;L</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{summary.holdings.map((holding) => <tr key={holding.symbol}>
          <td data-label="Company"><button className="holding-company" onClick={() => { const entry = watchlist.find((item) => item.symbol === holding.symbol) ?? { ...startStock, symbol: holding.symbol, name: holding.name }; selectStock(entry); }}><span className="table-ticker">{holding.symbol.slice(0, 1)}</span><span><strong>{holding.name}</strong><small>{holding.symbol}</small></span></button></td>
          <td data-label="Shares">{holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td><td data-label="Avg. cost">{money(holding.averagePrice)}</td><td data-label="Latest">{holding.price === null ? <span className="muted-cell">Unavailable</span> : <>{money(holding.price)}{quotes[holding.symbol]?.stale && <small className="muted-cell"> Stale</small>}</>}</td><td data-label="Market value">{holding.price === null ? '—' : money(holding.currentValue)}</td><td data-label="Unrealized P&L">{holding.price === null ? '—' : <span className={holding.unrealizedPnl >= 0 ? 'positive' : 'negative'}>{signedMoney(holding.unrealizedPnl)} <small>({percent.format(holding.unrealizedPnlPercent / 100)})</small></span>}</td>
          <td data-label="Actions"><div className="row-actions"><button className="icon-button" onClick={() => { const entry = watchlist.find((item) => item.symbol === holding.symbol) ?? { ...startStock, symbol: holding.symbol, name: holding.name }; setActiveStock(entry); setEditing(holding); setModalOpen(true); }} aria-label={`Edit ${holding.symbol} holding`}><BriefcaseBusiness size={15} /></button><button className="icon-button danger-hover" onClick={() => removeHolding(holding.symbol)} aria-label={`Remove ${holding.symbol} holding`}><Trash2 size={15} /></button></div></td>
        </tr>)}</tbody></table></div>}
      </section>

      <footer className="dashboard-footer"><span>Equity · Personal investment tracking</span><span>Market data provided by Alpha Vantage · Values shown in USD</span></footer>
    </div>
    <HoldingDialog open={modalOpen} initial={editing} symbol={editing?.symbol ?? activeStock.symbol} name={editing?.name ?? activeStock.name} onClose={closeModal} onSave={saveHolding} />
  </main>;
}
