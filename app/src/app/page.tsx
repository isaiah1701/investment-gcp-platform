'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Cloud, CloudSun, Compass, MapPin, RefreshCw, Sparkles } from 'lucide-react';
import { CitySearch } from '@/components/city-search';
import { HourlyForecastView, WeeklyForecast } from '@/components/forecasts';
import { TemperatureChart } from '@/components/temperature-chart';
import { WeatherDetails } from '@/components/weather-details';
import { WeatherHero } from '@/components/weather-hero';
import { displayTemperature, formatLocalHour } from '@/lib/weather-utils';
import type { WeatherLocation, WeatherReport } from '@/lib/weather-types';

type Unit = 'C' | 'F';

export default function HomePage() {
  const [location, setLocation] = useState<WeatherLocation | null>(null);
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [unit, setUnit] = useState<Unit>('C');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectLocation = useCallback((next: WeatherLocation) => {
    setError('');
    setLoading(true);
    setLocation(next);
  }, []);

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/weather?cityId=${encodeURIComponent(location.id)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Weather is temporarily unavailable.');
        if (!payload.weather?.current || !Array.isArray(payload.weather.hourly) || !Array.isArray(payload.weather.daily)) {
          throw new Error('The forecast response was incomplete. Please try again.');
        }
        setReport(payload.weather as WeatherReport);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Weather is temporarily unavailable.');
        setReport(null);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [location]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/locations?q=London', { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not find the default city.');
        const london = payload.locations?.find((item: WeatherLocation) => item.name.toLowerCase() === 'london') ?? payload.locations?.[0];
        if (!london) throw new Error('The default city is unavailable. Search for a city to get started.');
        setLocation(london);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Weather is temporarily unavailable.');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  const insight = useMemo(() => {
    if (!report) return '';
    const rainyHour = report.hourly.slice(0, 8).find((hour) => (hour.precipitationProbability ?? 0) >= 40);
    if (rainyHour) {
      return `Rain is possible around ${formatLocalHour(rainyHour.time, report.location.timezone)}. The forecast gives it a ${rainyHour.precipitationProbability}% chance.`;
    }
    if (report.current.uvIndex !== null && report.current.uvIndex >= 6) {
      return 'UV levels are high today. Bring sun protection if you’ll be outside for long.';
    }
    if (report.current.windSpeed !== null && report.current.windSpeed >= 30) {
      return 'It’s windy out. Secure loose items and expect a stronger breeze in exposed areas.';
    }
    return `No significant rain is expected in the next few hours. Today’s high is ${displayTemperature(report.current.temperatureMax, unit)}° and low is ${displayTemperature(report.current.temperatureMin, unit)}°.`;
  }, [report, unit]);

  const retry = () => {
    if (!location) return;
    const current = location;
    setLocation(null);
    window.setTimeout(() => setLocation(current), 0);
  };

  return <div className="sky-page">
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Sky weather home">
        <span className="brand-icon"><CloudSun size={22} strokeWidth={1.7} /></span>
        <span><span className="brand-name">Sky</span><span className="brand-tagline">Your weather, at a glance</span></span>
      </Link>
      <div className="header-actions">
        <CitySearch selected={location} onSelect={selectLocation} />
        <div className="unit-switch" role="group" aria-label="Temperature unit">
          <button type="button" className={unit === 'C' ? 'active' : ''} aria-pressed={unit === 'C'} onClick={() => setUnit('C')}>°C</button>
          <button type="button" className={unit === 'F' ? 'active' : ''} aria-pressed={unit === 'F'} onClick={() => setUnit('F')}>°F</button>
        </div>
      </div>
    </header>

    <main className="weather-main">
      <div className="welcome-line">
        <div><span className="page-kicker">WEATHER DASHBOARD</span><span className="live-indicator"><i /> Live conditions</span></div>
        <span className="mode-note">Search by city or country · choose a country to narrow results</span>
      </div>

      {loading && <div className="loading-state"><div><div className="loading-orb" /><div className="loading-copy">Getting the latest forecast…</div></div></div>}
      {!loading && error && <div className="error-state"><div className="glass-card error-card"><span className="error-icon"><Cloud size={22} /></span><h1>Couldn’t load this forecast</h1><p>{error}</p><button type="button" className="retry-button" onClick={retry}><RefreshCw size={14} />Try again</button></div></div>}

      {!loading && !error && report && <>
        <WeatherHero report={report} unit={unit} />
        <div className="content-grid">
          <div className="left-stack">
            <section className="glass-card section-card forecast-card">
              <div className="section-heading"><div><span className="section-eyebrow">HOUR BY HOUR</span><h2 className="section-title">The next 24 hours</h2><p className="section-subtitle">Temperature and rain chance for {report.location.name}</p></div><span className="section-trailing">Hourly</span></div>
              <HourlyForecastView hours={report.hourly} timezone={report.location.timezone} unit={unit} />
              <div className="chart-heading"><div><h3 className="section-title">Temperature trend</h3><p className="section-subtitle">A closer look at the day ahead</p></div><span className="chart-unit">°{unit}</span></div>
              <TemperatureChart hours={report.hourly} timezone={report.location.timezone} unit={unit} />
            </section>
            <section className="glass-card section-card">
              <div className="section-heading"><div><span className="section-eyebrow">PLAN AHEAD</span><h2 className="section-title">{report.daily.length}-day forecast</h2><p className="section-subtitle">Highs, lows and rain chances</p></div><Compass className="section-icon" size={20} /></div>
              <WeeklyForecast days={report.daily} timezone={report.location.timezone} unit={unit} />
            </section>
          </div>

          <aside className="right-stack">
            <section className="glass-card section-card">
              <div className="section-heading"><div><span className="section-eyebrow">AT A GLANCE</span><h2 className="section-title">Weather details</h2><p className="section-subtitle">Current conditions in {report.location.name}</p></div><MapPin className="section-icon" size={19} /></div>
              <WeatherDetails report={report} />
            </section>
            <section className="glass-card insight-card">
              <div className="insight-heading"><span className="insight-icon"><Sparkles size={16} /></span><div><span className="section-eyebrow">FROM THE FORECAST</span><h2>What to expect</h2></div></div>
              <p>{insight}</p>
            </section>
          </aside>
        </div>
      </>}
    </main>

    <footer className="site-footer"><span>Sky · Weather made clear.</span><span className="provider-note"><MapPin size={13} />{report ? `${report.location.name}${report.location.region ? `, ${report.location.region}` : ''} · WeatherAPI` : 'WeatherAPI'}</span></footer>
  </div>;
}
