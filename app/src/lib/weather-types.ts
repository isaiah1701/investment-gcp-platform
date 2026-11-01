export type WeatherLocation = {
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  region?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type HourlyForecast = {
  time: string;
  temperature: number;
  precipitationProbability: number | null;
  weatherCode: number;
};

export type DailyForecast = {
  date: string;
  weatherCode: number;
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number | null;
  precipitation?: number | null;
  uvIndex?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
};

export type WeatherReport = {
  location: WeatherLocation;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    humidity: number | null;
    windSpeed: number | null;
    windGustSpeed?: number | null;
    visibility?: number | null;
    cloudCover?: number | null;
    uvIndex: number | null;
    precipitation: number | null;
    weatherCode: number;
    isDay: boolean;
    temperatureMin: number;
    temperatureMax: number;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  units: { temperature: '°C'; windSpeed: 'km/h'; precipitation: 'mm' };
};

export type WeatherCondition = {
  label: string;
  kind: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy';
};
