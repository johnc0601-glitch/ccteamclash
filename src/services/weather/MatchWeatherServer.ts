import {unstable_cache} from 'next/cache';
import {parseForecast, WEATHER_TIME_ZONE, type WeatherCondition, type WeatherForecast} from './MatchWeather';

type SourcedForecast = WeatherForecast & {source: 'NWS' | 'Open-Meteo'};

async function getJson(url: URL, headers?: HeadersInit) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers,
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
  return response.json();
}

const resolveLocation = unstable_cache(async (city: string, state: string) => {
  const states: Record<string, string> = {NC: 'North Carolina', SC: 'South Carolina', VA: 'Virginia'};
  const region = states[state.toUpperCase()] ?? state;
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({name: city, countryCode: 'US', count: '20', language: 'en'}).toString();
  const data = await getJson(url);
  const location = data.results?.find((item: {country_code?: string; admin1?: string; name?: string; latitude?: number; longitude?: number}) =>
    item.country_code === 'US' && item.admin1?.toLowerCase() === region.toLowerCase()
    && item.name?.toLowerCase() === city.toLowerCase()
    && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  return location ? {latitude: location.latitude as number, longitude: location.longitude as number} : null;
}, ['match-weather-location-v1'], {revalidate: 2592000});

const resolveNwsEndpoints = unstable_cache(async (latitude: number, longitude: number) => {
  const url = new URL(`https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`);
  const data = await getJson(url, nwsHeaders());
  const forecast = data?.properties?.forecast;
  const forecastHourly = data?.properties?.forecastHourly;
  return typeof forecast === 'string' && typeof forecastHourly === 'string'
    ? {forecast, forecastHourly}
    : null;
}, ['match-weather-nws-point-v1'], {revalidate: 2592000});

function nwsHeaders(): HeadersInit {
  return {
    Accept: 'application/geo+json',
    'User-Agent': 'ccteamclash.com weather (https://ccteamclash.com)',
  };
}

type NwsPeriod = {
  startTime?: unknown;
  temperature?: unknown;
  temperatureUnit?: unknown;
  isDaytime?: unknown;
  probabilityOfPrecipitation?: {value?: unknown} | null;
  windSpeed?: unknown;
  windDirection?: unknown;
  shortForecast?: unknown;
};

async function getNwsWeather(latitude: number, longitude: number, matchDate: string): Promise<SourcedForecast | null> {
  const endpoints = await resolveNwsEndpoints(latitude, longitude);
  if (!endpoints) return null;

  const [daily, hourly] = await Promise.all([
    getJson(new URL(endpoints.forecast), nwsHeaders()),
    getJson(new URL(endpoints.forecastHourly), nwsHeaders()),
  ]);
  return parseNwsForecast(daily, hourly, matchDate);
}

function parseNwsForecast(dailyValue: unknown, hourlyValue: unknown, matchDate: string): SourcedForecast | null {
  const dailyPeriods = nwsPeriods(dailyValue);
  const hourlyPeriods = nwsPeriods(hourlyValue);
  if (!dailyPeriods.length || !hourlyPeriods.length) return null;

  const matchDaily = dailyPeriods.filter((period) => nwsDate(period) === matchDate);
  const daytime = matchDaily.find((period) => period.isDaytime === true);
  const nighttime = matchDaily.find((period) => period.isDaytime === false);
  const high = nwsTemperature(daytime);
  const low = nwsTemperature(nighttime);
  if (high === null || low === null || low > high) return null;

  const matchHourly = hourlyPeriods.filter((period) => nwsDate(period) === matchDate);
  const rainValues = matchHourly
    .map((period) => period.probabilityOfPrecipitation?.value)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100);
  if (!rainValues.length) return null;

  return {
    condition: nwsCondition(daytime?.shortForecast),
    high: Math.round(high),
    low: Math.round(low),
    rain: Math.round(Math.max(...rainValues)),
    ...nwsTypicalWind(matchHourly),
    updatedAt: new Date().toISOString(),
    source: 'NWS',
  };
}

function nwsPeriods(value: unknown): NwsPeriod[] {
  const periods = (value as {properties?: {periods?: unknown}} | null)?.properties?.periods;
  return Array.isArray(periods)
    ? periods.filter((period): period is NwsPeriod => Boolean(period) && typeof period === 'object')
    : [];
}

function nwsDate(period: NwsPeriod): string | null {
  return typeof period.startTime === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(period.startTime)
    ? period.startTime.slice(0, 10)
    : null;
}

function nwsTemperature(period: NwsPeriod | undefined): number | null {
  if (!period || typeof period.temperature !== 'number' || !Number.isFinite(period.temperature)) return null;
  if (period.temperatureUnit === 'C') return period.temperature * 9 / 5 + 32;
  return period.temperature;
}

function nwsCondition(value: unknown): WeatherCondition {
  if (typeof value !== 'string' || !value.trim()) return null;
  const label = value.trim();
  const normalized = label.toLowerCase();
  if (normalized.includes('thunder')) return {icon: 'storm', label};
  if (normalized.includes('snow') || normalized.includes('sleet') || normalized.includes('ice pellets')) return {icon: 'snow', label};
  if (normalized.includes('rain') || normalized.includes('shower') || normalized.includes('drizzle') || normalized.includes('freezing')) return {icon: 'rain', label};
  if (normalized.includes('fog') || normalized.includes('mist')) return {icon: 'fog', label};
  if (normalized.includes('partly') || normalized.includes('mostly cloudy')) return {icon: 'partly-cloudy', label};
  if (normalized.includes('cloud') || normalized.includes('overcast')) return {icon: 'cloud', label};
  if (normalized.includes('sun') || normalized.includes('clear')) return {icon: 'sun', label};
  return null;
}

function nwsTypicalWind(periods: NwsPeriod[]): {wind: number | null; windDirection: string | null} {
  const playingHours = periods.filter((period) => {
    if (typeof period.startTime !== 'string') return false;
    const hour = Number(period.startTime.slice(11, 13));
    return Number.isFinite(hour) && hour >= 8 && hour <= 17;
  });

  let count = 0;
  let speedSum = 0;
  let x = 0;
  let y = 0;
  let directionCount = 0;

  for (const period of playingHours) {
    const speed = nwsWindSpeed(period.windSpeed);
    if (speed === null) continue;
    count += 1;
    speedSum += speed;

    const degrees = nwsDirectionDegrees(period.windDirection);
    if (degrees !== null) {
      directionCount += 1;
      x += speed * Math.cos(degrees * Math.PI / 180);
      y += speed * Math.sin(degrees * Math.PI / 180);
    }
  }

  // NWS drops past hourly periods during the day. Four remaining playing-hour
  // samples are enough to keep the typical-wind display useful after tee time.
  if (count < 4) return {wind: null, windDirection: null};

  const wind = Math.round(speedSum / count);
  if (wind === 0) return {wind, windDirection: null};
  if (directionCount !== count || speedSum <= 0) return {wind, windDirection: null};
  if (Math.hypot(x, y) / speedSum < 0.2) return {wind, windDirection: 'Variable'};

  const degrees = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return {
    wind,
    windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8],
  };
}

function nwsWindSpeed(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  if (/calm/i.test(value)) return 0;
  const values = [...value.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((match) => Number(match[1]))
    .filter((item) => Number.isFinite(item));
  if (!values.length) return null;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function nwsDirectionDegrees(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const directions: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  return directions[value.trim().toUpperCase()] ?? null;
}

async function getOpenMeteoWeather(latitude: number, longitude: number, matchDate: string): Promise<SourcedForecast | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    hourly: 'wind_speed_10m,wind_direction_10m',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', timezone: WEATHER_TIME_ZONE,
    start_date: matchDate, end_date: matchDate,
  }).toString();

  const forecast = parseForecast(await getJson(url), matchDate);
  return forecast ? {...forecast, source: 'Open-Meteo'} : null;
}

// The Eastern calendar date is part of the persistent cache key. The first
// visit each day fetches a new forecast; subsequent visits reuse that snapshot.
// NWS is primary. Open-Meteo remains the fallback if NWS is unavailable or
// returns an incomplete forecast for the requested match day.
export const getDailyMatchWeather = unstable_cache(async (city: string, state: string, matchDate: string, refreshDate: string) => {
  void refreshDate;
  const location = await resolveLocation(city.trim(), state.trim()).catch(() => null);
  if (!location) return null;

  try {
    const nws = await getNwsWeather(location.latitude, location.longitude, matchDate);
    if (nws) return nws;
  } catch {
    // Weather is supplemental Matchday information; fall through quietly.
  }

  try {
    return await getOpenMeteoWeather(location.latitude, location.longitude, matchDate);
  } catch {
    return null;
  }
}, ['match-weather-daily-v4'], {revalidate: false});
