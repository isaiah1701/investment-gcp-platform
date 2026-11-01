'use client';

import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoryPoint, MarketEnvelope } from '@/lib/types';

type Props = { symbol: string; history: MarketEnvelope<HistoryPoint[]> | null; busy: boolean; error: string };
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const ranges = [{ label: '1M', days: 31 }, { label: '3M', days: 93 }, { label: 'All', days: 0 }];

export function MarketChart({ symbol, history, busy, error }: Props) {
  const [range, setRange] = useState('3M');
  const points = useMemo(() => {
    const values = history?.data ?? [];
    const selected = ranges.find((item) => item.label === range)?.days ?? 93;
    if (!selected || values.length === 0) return values;
    const cut = new Date(`${values[values.length - 1].date}T00:00:00Z`).getTime() - selected * 86_400_000;
    return values.filter((point) => new Date(`${point.date}T00:00:00Z`).getTime() >= cut);
  }, [history, range]);
  const color = points.length > 1 && points[points.length - 1].close >= points[0].close ? '#37c895' : '#ef7777';

  return <section className="panel chart-panel" aria-labelledby="chart-title">
    <div className="section-heading chart-heading"><div><span className="eyebrow">MARKET PERFORMANCE</span><h2 id="chart-title">{symbol} price history</h2><p>Daily closing prices · latest 100 observations available on this plan</p></div>
      <div className="range-tabs" role="group" aria-label="Chart date range">{ranges.map((item) => <button key={item.label} className={range === item.label ? 'selected' : ''} aria-pressed={range === item.label} onClick={() => setRange(item.label)}>{item.label}</button>)}</div>
    </div>
    {error ? <div className="chart-state error-text" role="status">{error}</div> : busy && !history ? <div className="chart-state">Loading daily history…</div> : points.length === 0 ? <div className="chart-state">No history is available for this ticker.</div> : <>
      <div className="chart-wrap" role="img" aria-label={`${symbol} daily closing price chart with ${points.length} observations`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.2} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#26313a" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#77838e', fontSize: 11 }} minTickGap={44} tickFormatter={(date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} />
            <YAxis axisLine={false} tickLine={false} width={62} tick={{ fill: '#77838e', fontSize: 11 }} tickFormatter={(value: number) => `$${value.toFixed(0)}`} domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip contentStyle={{ background: '#151b20', border: '1px solid #303b43', borderRadius: 10, color: '#e8ecef', fontSize: 12 }} labelFormatter={(date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })} formatter={(value) => [money.format(Number(value)), 'Close']} />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#equityFill)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">{history?.stale ? 'Showing stale cached data. ' : ''}{history?.mode === 'mock' ? 'Illustrative demo prices — not market data.' : `Data fetched ${new Date(history?.fetchedAt ?? '').toLocaleString()}.`}</p>
      <p className="sr-only">Price range: {points.length ? `${money.format(Math.min(...points.map((point) => point.close)))} to ${money.format(Math.max(...points.map((point) => point.close)))}` : 'unavailable'}.</p>
    </>}
  </section>;
}
