import { CloudRain } from 'lucide-react';
import { displayTemperature, formatLocalDay, formatLocalHour, weatherCondition } from '@/lib/weather-utils';
import type { DailyForecast, HourlyForecast } from '@/lib/weather-types';
import { WeatherIcon } from './weather-icon';

export function HourlyForecastView({ hours, timezone, unit }: { hours: HourlyForecast[]; timezone: string; unit: 'C' | 'F' }) {
  return <div className="hourly-scroll" aria-label="Hourly forecast for the next 24 hours">
    {hours.slice(0, 24).map((hour, index) => <div key={`${hour.time}-${index}`} className="hour-cell">
      <span className="hour-time">{index === 0 ? 'Now' : formatLocalHour(hour.time, timezone)}</span>
      <WeatherIcon className="hour-icon" code={hour.weatherCode} />
      <span className="hour-temp">{displayTemperature(hour.temperature, unit)}°</span>
      <span className="hour-rain"><CloudRain size={10} />{hour.precipitationProbability === null ? '—' : `${hour.precipitationProbability}%`}</span>
    </div>)}
  </div>;
}

export function WeeklyForecast({ days, timezone, unit }: { days: DailyForecast[]; timezone: string; unit: 'C' | 'F' }) {
  return <div className="week-list" aria-label={`${days.length}-day forecast`}>
    {days.slice(0, 7).map((day, index) => <div className="day-row" key={`${day.date}-${index}`}>
      <div><div className="day-name">{formatLocalDay(day.date, timezone, index === 0)}</div><div className="day-date">{new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: timezone }).format(new Date(`${day.date}T12:00:00Z`))}</div></div>
      <div className="day-condition"><WeatherIcon code={day.weatherCode} />{weatherCondition(day.weatherCode).label}</div>
      <div className="rain-chance">{day.precipitationProbability === null ? '—' : <><CloudRain size={10} /> {day.precipitationProbability}%</>}</div>
      <div className="temp-range"><span>{displayTemperature(day.temperatureMax, unit)}°</span><span className="temp-track" /><span className="low">{displayTemperature(day.temperatureMin, unit)}°</span></div>
    </div>)}
  </div>;
}
