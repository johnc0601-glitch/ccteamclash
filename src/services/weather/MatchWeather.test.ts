import assert from 'node:assert/strict';
import test from 'node:test';
import {
  daytimeWind,
  easternDate,
  parseForecast,
  parseNwsForecast,
  parseNwsWindSpeed,
  weatherVisible,
} from './MatchWeather';

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

test('Open-Meteo parser remains a valid fallback', () => {
  const daily = {
    time: ['2026-10-02', '2026-10-03'],
    temperature_2m_max: [60, 72.3],
    temperature_2m_min: [40, 55.1],
    precipitation_probability_max: [20, 0],
    wind_speed_10m_max: [5, 12.8],
  };
  const forecast = parseForecast({daily}, '2026-10-03');
  assert.equal(forecast?.high, 72);
  assert.equal(forecast?.rain, 0);
  assert.equal(forecast?.wind, null);
  assert.equal(forecast?.source, 'Open-Meteo');
  assert.equal(parseForecast({daily}, '2026-10-04'), null);
  assert.equal(parseForecast({daily: {...daily, temperature_2m_min: [40, null]}}, '2026-10-03'), null);
  assert.equal(parseForecast(null, '2026-10-03'), null);
});

test('NWS parser builds high, low, rain and typical playing-hours wind', () => {
  const daily = {
    properties: {
      periods: [
        {startTime: '2026-10-03T06:00:00-04:00', temperature: 74, temperatureUnit: 'F', isDaytime: true, shortForecast: 'Partly Sunny'},
        {startTime: '2026-10-03T18:00:00-04:00', temperature: 58, temperatureUnit: 'F', isDaytime: false, shortForecast: 'Mostly Clear'},
      ],
    },
  };
  const hourly = {
    properties: {
      periods: Array.from({length: 24}, (_, hour) => ({
        startTime: `2026-10-03T${String(hour).padStart(2, '0')}:00:00-04:00`,
        temperature: hour >= 8 && hour <= 17 ? 70 : 60,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: {value: hour === 14 ? 40 : 10},
        windSpeed: hour >= 8 && hour <= 17 ? '8 mph' : '4 mph',
        windDirection: 'NE',
        shortForecast: 'Partly Sunny',
      })),
    },
  };
  const forecast = parseNwsForecast(daily, hourly, '2026-10-03');
  assert.equal(forecast?.source, 'NWS');
  assert.equal(forecast?.high, 74);
  assert.equal(forecast?.low, 58);
  assert.equal(forecast?.rain, 40);
  assert.equal(forecast?.wind, 8);
  assert.equal(forecast?.windDirection, 'NE');
  assert.equal(forecast?.condition?.icon, 'partly-cloudy');
});

test('NWS wind parser supports calm and forecast ranges', () => {
  assert.equal(parseNwsWindSpeed('Calm'), 0);
  assert.equal(parseNwsWindSpeed('5 mph'), 5);
  assert.equal(parseNwsWindSpeed('5 to 9 mph'), 7);
  assert.equal(parseNwsWindSpeed(undefined), null);
});

test('typical Open-Meteo wind excludes overnight peaks and wraps north correctly', () => {
  const hourly = {
    time: Array.from({length:24}, (_, i) => `2026-10-03T${String(i).padStart(2, '0')}:00`),
    wind_speed_10m: Array.from({length:24}, (_, i) => i >= 8 && i <= 17 ? 10 : 50),
    wind_direction_10m: Array.from({length:24}, (_, i) => i % 2 ? 350 : 10),
  };
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:10, windDirection:'N'});
  hourly.wind_direction_10m.fill(225);
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:10, windDirection:'SW'});
  hourly.wind_direction_10m = hourly.wind_direction_10m.map((_, i) => i % 2 ? 90 : 270);
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:10, windDirection:'Variable'});
  hourly.wind_speed_10m.fill(0);
  assert.deepEqual(daytimeWind({hourly}, '2026-10-03'), {wind:0, windDirection:null});
  assert.deepEqual(daytimeWind({hourly}, '2026-10-04'), {wind:null, windDirection:null});
});
