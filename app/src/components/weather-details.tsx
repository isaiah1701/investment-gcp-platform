import { CloudRain, Droplets, Eye, Sun, Sunrise, Sunset, Wind } from 'lucide-react';
import type { WeatherReport } from '@/lib/weather-types';

export function WeatherDetails({ report }: { report: WeatherReport }) {
  const uv = report.current.uvIndex;
  const humidity = report.current.humidity;
  const wind = report.current.windSpeed;
  const gusts = report.current.windGustSpeed ?? null;
  const visibility = report.current.visibility ?? null;
  const cloudCover = report.current.cloudCover ?? null;
  const precipitation = report.current.precipitation;
  const sunrise = report.daily[0]?.sunrise;
  const sunset = report.daily[0]?.sunset;
  return <>
    <div className="details-grid" aria-label="Weather details">
    <Detail icon={<Droplets size={14} />} iconClass="blue" title="Humidity" value={humidity === null ? null : `${humidity}%`} note={humidity === null ? 'Unavailable' : humidity > 68 ? 'A little humid' : 'Comfortable'} meter={humidity} />
    <Detail icon={<Wind size={14} />} iconClass="purple" title="Wind" value={wind === null ? null : `${Math.round(wind)} km/h`} note={wind === null ? 'Unavailable' : gusts === null ? (wind > 25 ? 'Breezy' : 'Light breeze') : `Gusts ${Math.round(gusts)} km/h`} meter={wind === null ? null : Math.min(100, wind * 2.2)} />
    <Detail icon={<Sun size={14} />} iconClass="gold" title="UV index" value={uv === null ? null : uv.toFixed(0)} note={uv === null ? 'Unavailable' : uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : 'High'} meter={uv === null ? null : Math.min(100, uv * 10)} />
    <Detail icon={<CloudRain size={14} />} iconClass="blue" title="Precipitation" value={precipitation === null ? null : `${precipitation.toFixed(1)} mm`} note={precipitation === null ? 'Unavailable' : precipitation > 0 ? 'Latest reading' : 'None in latest reading'} />
    <Detail icon={<Eye size={14} />} iconClass="purple" title="Visibility" value={visibility === null ? null : `${visibility.toFixed(1)} km`} note={visibility === null ? 'Unavailable' : visibility >= 10 ? 'Clear sightlines' : 'Reduced visibility'} />
    <Detail icon={<CloudRain size={14} />} iconClass="blue" title="Cloud cover" value={cloudCover === null ? null : `${Math.round(cloudCover)}%`} note={cloudCover === null ? 'Unavailable' : cloudCover < 25 ? 'Mostly clear' : cloudCover < 70 ? 'Some clouds' : 'Mostly cloudy'} meter={cloudCover} />
    </div>
    {(sunrise || sunset) && <div className="sunrise-row"><span><Sunrise size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Sunrise {sunrise ?? '—'}</span><span><Sunset size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Sunset {sunset ?? '—'}</span></div>}
  </>;
}

function Detail({ icon, iconClass, title, value, note, meter }: { icon: React.ReactNode; iconClass: string; title: string; value: string | null; note: string; meter?: number | null }) {
  return <article className="detail-card"><div className="detail-head"><span className={`detail-icon ${iconClass}`}>{icon}</span>{title}</div>
    {value === null ? <div className="unavailable">Unavailable</div> : <><div className="detail-value">{value}</div><div className="detail-note">{note}</div>{meter !== undefined && meter !== null && <div className="meter"><span style={{ width: `${Math.max(4, Math.min(meter, 100))}%` }} /></div>}</>}
  </article>;
}
