import {unstable_cache} from 'next/cache';
import {parseForecast, parseNwsForecast, WEATHER_TIME_ZONE} from './MatchWeather';

async function getJson(url: URL, init?: RequestInit) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
    ...init,
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

type NwsEndpoints = {forecast: string; forecastHourly: string};

const resolveNwsEndpoints = unstable_cache(async (latitude: number, longitude: number): Promise<NwsEndpoints | null> => {
  const url = new URL(`https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`);
  const data = await getJson(url, {headers: nwsHeaders()});
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

async function getNwsWeather(latitude: number, longitude: number, matchDate: string) {
  const endpoints = await resolveNwsEndpoints(latitude, longitude);
  if (!endpoints) return null;
  const [daily, hourly] = await Promise.all([
    getJson(new URL(endpoints.forecast), {headers: nwsHeaders()}),
    getJson(new URL(endpoints.forecastHourly), {headers: nwsHeaders()}),
  ]);
  return parseNwsForecast(daily, hourly, matchDate);
}

async function getOpenMeteoWeather(latitude: number, longitude: number, matchDate: string) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    hourly: 'wind_speed_10m,wind_direction_10m',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', timezone: WEATHER_TIME_ZONE,
    start_date: matchDate, end_date: matchDate,
  }).toString();
  return parseForecast(await getJson(url), matchDate);
}

// The Eastern calendar date is part of the persistent cache key. The first
// visit each day fetches a new forecast; subsequent visits reuse that snapshot.
// NWS is primary. Open-Meteo is retained as the fallback provider.
// A date/course change naturally gets a separate entry.
export const getDailyMatchWeather = unstable_cache(async (city: string, state: string, matchDate: string, refreshDate: string) => {
  void refreshDate;
  const location = await resolveLocation(city.trim(), state.trim()).catch(() => null);
  if (!location) return null;

  try {
    const nws = await getNwsWeather(location.latitude, location.longitude, matchDate);
    if (nws) return nws;
  } catch {
    // Fall through to Open-Meteo. Provider failures are intentionally silent
    // because weather is supplemental Matchday information.
  }

  try {
    return await getOpenMeteoWeather(location.latitude, location.longitude, matchDate);
  } catch {
    return null;
  }
}, ['match-weather-daily-v4'], {revalidate: false});
