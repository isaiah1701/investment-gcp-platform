import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun } from 'lucide-react';
import { weatherCondition } from '@/lib/weather-utils';

export function WeatherIcon({ code, isDay = true, className }: { code: number; isDay?: boolean; className?: string }) {
  const condition = weatherCondition(code);
  if (!isDay && condition.kind === 'sunny') return <Moon className={className} strokeWidth={1.4} />;
  const common = { className, strokeWidth: 1.45 };
  switch (condition.kind) {
    case 'sunny': return code === 0 ? <Sun {...common} /> : <CloudSun {...common} />;
    case 'cloudy': return code === 2 ? <CloudSun {...common} /> : <Cloud {...common} />;
    case 'rainy': return [51, 53, 55, 56, 57].includes(code) ? <CloudDrizzle {...common} /> : <CloudRain {...common} />;
    case 'snowy': return <CloudSnow {...common} />;
    case 'stormy': return <CloudLightning {...common} />;
    case 'foggy': return <CloudFog {...common} />;
  }
}
