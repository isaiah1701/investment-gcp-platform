'use client';

import React, { useEffect, useId, useState } from 'react';
import { LoaderCircle, Search, X } from 'lucide-react';
import type { StockSearchResult } from '@/lib/types';

type Props = { onSelect: (stock: StockSearchResult) => void };

export function EquitySearch({ onSelect }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) { setResults([]); setError(''); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError(''); setOpen(true);
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(clean)}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || 'Search is unavailable.');
        setResults(body.data ?? []);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Search is unavailable.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function choose(stock: StockSearchResult) {
    onSelect(stock); setQuery(''); setResults([]); setOpen(false); setError('');
  }

  return <div className="equity-search">
    <label className="sr-only" htmlFor={inputId}>Search US stocks by company or ticker</label>
    <Search size={17} aria-hidden="true" />
    <input id={inputId} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => query.length > 1 && setOpen(true)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); if (event.key === 'Enter' && results[0]) choose(results[0]); }} placeholder="Search stocks…" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open && query.length > 1} aria-controls={`${inputId}-results`} />
    {loading && <LoaderCircle size={16} className="spin" aria-label="Searching" />}
    {query && <button className="icon-button search-clear" type="button" aria-label="Clear stock search" onClick={() => { setQuery(''); setOpen(false); }}><X size={15} /></button>}
    {open && query.length > 1 && <>
      <button className="search-dismiss" aria-label="Close search results" tabIndex={-1} onClick={() => setOpen(false)} />
      <div className="search-popover" id={`${inputId}-results`} role="listbox" aria-label="Stock search results">
        {loading && <p className="search-state">Searching the US market…</p>}
        {!loading && error && <p className="search-state error-text">{error}</p>}
        {!loading && !error && results.length === 0 && <p className="search-state">No US-listed matches. Try a ticker such as AAPL.</p>}
        {!loading && results.map((stock) => <button className="search-option" key={stock.symbol} type="button" role="option" aria-selected="false" onClick={() => choose(stock)}>
          <span className="ticker-chip">{stock.symbol.slice(0, 1)}</span><span className="search-option-copy"><strong>{stock.symbol}</strong><small>{stock.name}</small></span><span className="search-region">US · {stock.exchange}</span>
        </button>)}
        <p className="search-footnote">Search is limited to US equities so portfolio values stay in USD.</p>
      </div>
    </>}
  </div>;
}
