export const WEATHER_TIME_ZONE = 'America/New_York';

export function easternDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WEATHER_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function weatherVisible(matchDate: string | undefined, lifecycle: string, today: string): boolean {
  if (!matchDate || !/^\d{4}-\d{2}-\d{2}$/.test(matchDate)
    || !['Scheduled', 'Rain Delay'].includes(lifecycle)) return false;
  const date = new Date(`${matchDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== matchDate) return false;
  // A Monday match opens on the preceding Monday, not on match morning.
  const daysSinceMonday = (date.getUTCDay() + 6) % 7 || 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return today >= date.toISOString().slice(0, 10) && today <= matchDate;
}

export type WeatherForecast = {
  condition: WeatherCondition; high: number; low: number; rain: number; wind: number; updatedAt: string;
};

export function parseForecast(value: unknown, matchDate: string): WeatherForecast | null {
  const daily = (value as {daily?: Record<string, unknown>} | null)?.daily;
  if (!daily || !Array.isArray(daily.time)) return null;
  const index = daily.time.indexOf(matchDate);
  if (index < 0) return null;
  const fields = ['temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'wind_speed_10m_max'];
  const values = fields.map(field => Array.isArray(daily[field]) ? daily[field][index] : undefined);
  if (!values.every(value => typeof value === 'number' && Number.isFinite(value))) return null;
  const [high, low, rain, wind] = values as number[];
  if (rain < 0 || rain > 100 || wind < 0 || low > high) return null;
  const code = Array.isArray(daily.weather_code) ? daily.weather_code[index] : undefined;
  return {condition: weatherCondition(code), high: Math.round(high), low: Math.round(low), rain: Math.round(rain), wind: Math.round(wind), updatedAt: new Date().toISOString()};
}

export type WeatherCondition = {icon: 'sun' | 'cloud' | 'partly-cloudy' | 'rain' | 'storm' | 'snow' | 'fog'; label: string} | null;

// WMO weather interpretation codes supplied by Open-Meteo, not inferred from rain probability.
export function weatherCondition(code: unknown): WeatherCondition {
  if (code === 0) return {icon: 'sun', label: 'Sunny'};
  if (code === 1) return {icon: 'sun', label: 'Mainly clear'};
  if (code === 2) return {icon: 'partly-cloudy', label: 'Partly cloudy'};
  if (code === 3) return {icon: 'cloud', label: 'Cloudy'};
  if (code === 45 || code === 48) return {icon: 'fog', label: 'Fog'};
  if ([51, 53, 55].includes(code as number)) return {icon: 'rain', label: 'Drizzle'};
  if ([56, 57, 66, 67].includes(code as number)) return {icon: 'rain', label: 'Freezing rain'};
  if ([61, 63, 65, 80, 81, 82].includes(code as number)) return {icon: 'rain', label: 'Rain'};
  if ([71, 73, 75, 77, 85, 86].includes(code as number)) return {icon: 'snow', label: 'Snow'};
  if ([95, 97].includes(code as number)) return {icon: 'storm', label: 'Thunderstorms'};
  if ([96, 99].includes(code as number)) return {icon: 'storm', label: 'Thunderstorms with hail'};
  return null;
}
