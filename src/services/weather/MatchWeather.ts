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
  high: number; low: number; rain: number; wind: number; updatedAt: string;
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
  return {high: Math.round(high), low: Math.round(low), rain: Math.round(rain), wind: Math.round(wind), updatedAt: new Date().toISOString()};
}
