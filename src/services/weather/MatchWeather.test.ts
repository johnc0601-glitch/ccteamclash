import assert from 'node:assert/strict';
import test from 'node:test';
import {easternDate, weatherVisible, parseForecast, daytimeWind} from './MatchWeather';

test('Saturday forecast opens Monday and closes after match day in Eastern time', () => {
  assert.equal(weatherVisible('2026-10-03', 'Scheduled', '2026-09-27'), false);
  assert.equal(weatherVisible('2026-10-03', 'Scheduled', '2026-09-28'), true);
  assert.equal(weatherVisible('2026-10-03', 'Scheduled', '2026-10-03'), true);
  assert.equal(weatherVisible('2026-10-03', 'Scheduled', '2026-10-04'), false);
  assert.equal(easternDate(new Date('2026-09-28T03:59:59Z')), '2026-09-27');
  assert.equal(easternDate(new Date('2026-09-28T04:00:00Z')), '2026-09-28');
});
test('handles winter, Monday matches, date changes and inactive matches', () => {
  assert.equal(easternDate(new Date('2027-01-04T04:59:59Z')), '2027-01-03');
  assert.equal(weatherVisible('2027-01-04', 'Scheduled', '2026-12-28'), true);
  assert.equal(weatherVisible('2026-10-10', 'Scheduled', '2026-09-28'), false);
  for (const status of ['Completed', 'Cancelled', 'Postponed']) assert.equal(weatherVisible('2026-10-03', status, '2026-09-28'), false);
  for (const date of [undefined, '', '2026-02-30']) assert.equal(weatherVisible(date, 'Scheduled', '2026-09-28'), false);
});
test('uses the requested match date and rejects missing forecast values instead of showing zero', () => {
  const daily = {time: ['2026-10-02', '2026-10-03'], temperature_2m_max: [60, 72.3], temperature_2m_min: [40, 55.1], precipitation_probability_max: [20, 0], wind_speed_10m_max: [5, 12.8]};
  const forecast = parseForecast({daily}, '2026-10-03');
  assert.equal(forecast?.high, 72); assert.equal(forecast?.rain, 0); assert.equal(forecast?.wind, null);
  assert.equal(parseForecast({daily}, '2026-10-04'), null);
  assert.equal(parseForecast({daily: {...daily, temperature_2m_min: [40, null]}}, '2026-10-03'), null);
  assert.equal(parseForecast(null, '2026-10-03'), null);
});

test('typical wind excludes overnight peaks and wraps north correctly', () => {
  const hourly = {time: Array.from({length:24}, (_, i) => `2026-10-03T${String(i).padStart(2, '0')}:00`), wind_speed_10m: Array.from({length:24}, (_, i) => i >= 8 && i <= 17 ? 10 : 50), wind_direction_10m: Array.from({length:24}, (_, i) => i % 2 ? 350 : 10)};
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:10, windDirection:'N'});
  hourly.wind_direction_10m.fill(225);
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:10, windDirection:'SW'});
  hourly.wind_direction_10m = hourly.wind_direction_10m.map((_, i) => i % 2 ? 90 : 270);
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:10, windDirection:'Variable'});
  hourly.wind_speed_10m.fill(0);
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:0, windDirection:null});
  assert.deepEqual(daytimeWind({hourly}, '2026-10-04'), {wind:null, windDirection:null});
});
