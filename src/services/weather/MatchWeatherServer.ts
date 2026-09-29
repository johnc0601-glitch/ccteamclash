import {unstable_cache} from 'next/cache';
import {parseForecast, WEATHER_TIME_ZONE} from './MatchWeather';

async function getJson(url: URL) {
  const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(6000)});
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

// The Eastern calendar date is part of the persistent cache key. The first
// visit each day fetches a new forecast; subsequent visits reuse that snapshot.
// A date/course change naturally gets a separate entry. Failures are cached
// for that day as well, so provider downtime cannot hammer the upstream API.
export const getDailyMatchWeather = unstable_cache(async (city: string, state: string, matchDate: string, refreshDate: string) => {
  void refreshDate;
  try {
    const location = await resolveLocation(city.trim(), state.trim());
    if (!location) return null;
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(location.latitude), longitude: String(location.longitude),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
      temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', timezone: WEATHER_TIME_ZONE,
      start_date: matchDate, end_date: matchDate,
    }).toString();
    return parseForecast(await getJson(url), matchDate);
  } catch {
    return null;
  }
}, ['match-weather-daily-v1'], {revalidate: false});
