import { MapPin, Sparkles } from 'lucide-react';
import { weatherCondition, displayTemperature, formatCityDateTime } from '@/lib/weather-utils';
import type { WeatherReport } from '@/lib/weather-types';
import { WeatherIcon } from './weather-icon';

export function WeatherHero({ report, unit }: { report: WeatherReport; unit: 'C' | 'F' }) {
  const condition = weatherCondition(report.current.weatherCode);
  const heroTone = report.current.isDay ? condition.kind : 'night';
  const time = formatCityDateTime(new Date(), report.location.timezone);
  return <section className={`hero ${heroTone}`} aria-label="Current weather">
    <div className="hero-content">
      <div className="hero-location"><MapPin size={16} />{report.location.name}<span className="hero-country">· {report.location.country}</span></div>
      <div className="hero-time">{time}</div>
      <div className="hero-temp-row"><div className="hero-temp">{displayTemperature(report.current.temperature, unit)}<span className="hero-temp-unit">°{unit}</span></div><WeatherIcon code={report.current.weatherCode} isDay={report.current.isDay} className={`hero-current-icon ${condition.kind}`} /></div>
      <div className="hero-condition">{condition.label}</div>
      <div className="hero-summary">High {displayTemperature(report.current.temperatureMax, unit)}° · Low {displayTemperature(report.current.temperatureMin, unit)}° · Feels like <strong>{displayTemperature(report.current.feelsLike, unit)}°</strong></div>
    </div>
    <div className="hero-art" aria-hidden="true">
      {condition.kind === 'sunny' && report.current.isDay && <div className="sun-disc" />}
      <WeatherIcon code={report.current.weatherCode} isDay={report.current.isDay} className={`hero-weather-icon ${condition.kind}`} />
      <Sparkles className="hero-sparkle one" size={16} /><Sparkles className="hero-sparkle two" size={10} /><Sparkles className="hero-sparkle three" size={12} />
    </div>
    <div className="hero-meta">
      <div className="hero-meta-item"><span className="hero-meta-label">Feels like</span><span className="hero-meta-value">{displayTemperature(report.current.feelsLike, unit)}°</span></div>
      <div className="hero-meta-item"><span className="hero-meta-label">Humidity</span><span className="hero-meta-value">{report.current.humidity === null ? '—' : `${report.current.humidity}%`}</span></div>
      <div className="hero-meta-item"><span className="hero-meta-label">Wind</span><span className="hero-meta-value">{report.current.windSpeed === null ? '—' : `${Math.round(report.current.windSpeed)} km/h`}</span></div>
      <div className="hero-meta-item"><span className="hero-meta-label">UV index</span><span className="hero-meta-value">{report.current.uvIndex === null ? '—' : report.current.uvIndex.toFixed(0)}</span></div>
    </div>
  </section>;
}
