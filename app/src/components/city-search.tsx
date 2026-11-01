'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Command, MapPin, Search } from 'lucide-react';
import type { WeatherLocation } from '@/lib/weather-types';

export function CitySearch({ selected, onSelect }: { selected: WeatherLocation | null; onSelect: (location: WeatherLocation) => void }) {
  const [query, setQuery] = useState(selected?.name ?? '');
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(selected ? `${selected.name}, ${selected.country}` : '');
  }, [selected]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setLocations([]); setMessage(''); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Location search is unavailable.');
        setLocations(Array.isArray(payload.locations) ? payload.locations : []);
        setCountry('');
        setMessage(payload.locations?.length ? '' : 'No matching places. Try a city or country name.');
        setActive(0);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLocations([]);
        setMessage(error instanceof Error ? error.message : 'Location search is unavailable.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, open]);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  const choose = (location: WeatherLocation) => {
    setQuery(`${location.name}, ${location.country}`);
    setOpen(false);
    setCountry('');
    onSelect(location);
  };
  const countries = [...new Set(locations.map((location) => location.country))].sort((a, b) => a.localeCompare(b));
  const visibleLocations = country ? locations.filter((location) => location.country === country) : locations;
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && visibleLocations.length) { event.preventDefault(); setActive((index) => (index + 1) % visibleLocations.length); }
    if (event.key === 'ArrowUp' && visibleLocations.length) { event.preventDefault(); setActive((index) => (index - 1 + visibleLocations.length) % visibleLocations.length); }
    if (event.key === 'Enter' && visibleLocations.length && open) { event.preventDefault(); choose(visibleLocations[active]); }
    if (event.key === 'Escape') setOpen(false);
  };

  return <div className="city-search" ref={rootRef}>
    <form className="search-form" role="search" onSubmit={(event) => { event.preventDefault(); if (visibleLocations[active]) choose(visibleLocations[active]); }}>
      <Search size={16} aria-hidden="true" />
      <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setCountry(''); setOpen(true); }} onFocus={() => { if (query.length > 1) setOpen(true); }} onKeyDown={onKeyDown} placeholder="Search city or country" aria-label="Search for a city or country" aria-autocomplete="list" aria-controls="city-suggestions" />
      <kbd className="search-shortcut"><Command size={9} /> K</kbd>
    </form>
    {open && query.trim().length > 1 && <div className="search-results" id="city-suggestions" role="region" aria-label="Location suggestions">
      {loading && <div className="search-message">Searching places…</div>}
      {!loading && countries.length > 0 && <div className="search-country-filter"><label htmlFor="country-filter">Choose a country</label><select id="country-filter" value={country} onChange={(event) => { setCountry(event.target.value); setActive(0); }}><option value="">All countries</option>{countries.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>}
      {!loading && visibleLocations.map((location, index) => <button key={location.id} type="button" className={`search-result${active === index ? ' selected' : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(location)} onMouseEnter={() => setActive(index)}>
        <span className="result-pin"><MapPin size={16} /></span>
        <span className="result-copy"><span className="result-name">{location.name}</span><span className="result-region">{location.region || location.country}</span></span>
        <span className="result-country">{location.country}</span>
      </button>)}
      {!loading && locations.length > 0 && visibleLocations.length === 0 && <div className="search-message">No matching cities in {country}.</div>}
      {!loading && message && <div className="search-message">{message}</div>}
    </div>}
  </div>;
}
