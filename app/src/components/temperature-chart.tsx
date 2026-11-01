'use client';

import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { displayTemperature, formatLocalHour } from '@/lib/weather-utils';
import type { HourlyForecast } from '@/lib/weather-types';

export function TemperatureChart({ hours, timezone, unit }: { hours: HourlyForecast[]; timezone: string; unit: 'C' | 'F' }) {
  const gradientId = useId().replace(/:/g, '');
  const data = hours.slice(0, 24).map((hour) => ({
    time: formatLocalHour(hour.time, timezone), temperature: displayTemperature(hour.temperature, unit),
    rain: hour.precipitationProbability,
  }));
  return <div className="chart-wrap" aria-label="Temperature over the next 24 hours">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -21 }}>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#50afd3" stopOpacity={0.24} /><stop offset="94%" stopColor="#50afd3" stopOpacity={0.01} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#e8eef3" strokeDasharray="3 5" />
        <XAxis dataKey="time" tick={{ fill: '#8190a1', fontSize: 10 }} tickLine={false} axisLine={false} interval={3} dy={8} />
        <YAxis tick={{ fill: '#8190a1', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value}°`} domain={['dataMin - 2', 'dataMax + 3']} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tooltip"><div className="chart-tooltip-time">{label}</div><div className="chart-tooltip-temp">{payload[0].value}°{unit}</div><div className="chart-tooltip-rain">Rain chance {payload[0].payload.rain ?? '—'}%</div></div> : null} />
        <Area type="monotone" dataKey="temperature" stroke="#278bb5" strokeWidth={2.5} fill={`url(#${gradientId})`} activeDot={{ r: 4, fill: '#d9f3fb', stroke: '#277b9e', strokeWidth: 2 }} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
