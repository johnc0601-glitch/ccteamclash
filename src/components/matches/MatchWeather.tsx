import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {easternDate, weatherVisible, WEATHER_TIME_ZONE} from '@/services/weather/MatchWeather';
import {getDailyMatchWeather} from '@/services/weather/MatchWeatherServer';
import {WeatherIcon} from './WeatherIcon';
import styles from './MatchWeather.module.css';

export async function MatchWeather({matchday}: {matchday: PublicMatchday}) {
  const today = easternDate();
  if (!weatherVisible(matchday.scheduledDate, matchday.lifecycle, today)) return null;
  const course = matchday.courseDetails;
  const forecast = course?.city && course?.state
    ? await getDailyMatchWeather(course.city, course.state, matchday.scheduledDate!, today)
    : null;
  if (!forecast) return <section className={styles.weather} aria-label="Match-day weather"><span>Weather {course?.city && course?.state ? 'temporarily unavailable' : 'pending course location'}</span></section>;

  const wind = forecast.wind === null
    ? '—'
    : forecast.wind === 0
      ? 'Calm'
      : `${forecast.windDirection === 'Variable' ? 'Var' : forecast.windDirection ?? ''} ${forecast.wind} mph`.trim();
  const updated = new Intl.DateTimeFormat('en-US', {timeZone: WEATHER_TIME_ZONE, month: 'short', day: 'numeric'}).format(new Date(forecast.updatedAt));
  const provider = forecast.source === 'NWS' ? 'National Weather Service' : 'Open-Meteo';

  return <section className={styles.weather} aria-label="Match-day weather" title={`${course?.city ?? 'Course'} area · Updated ${updated} · Updates daily · Weather data: ${provider}`}>
    <span className={styles.item} aria-label={`${forecast.condition?.label ?? 'Forecast'}, high ${forecast.high}, low ${forecast.low} degrees Fahrenheit`}>
      {forecast.condition && <WeatherIcon name={forecast.condition.icon} />}<strong>{forecast.high}°/{forecast.low}°</strong>
    </span>
    <span className={styles.item} aria-label={`Rain chance ${forecast.rain} percent`}><WeatherIcon name="rain" /><strong>{forecast.rain}%</strong></span>
    <span className={styles.item} aria-label={`Typical wind, 8am to 5pm: ${forecast.windDirection ?? ''} ${forecast.wind === null ? 'unavailable' : `${forecast.wind} miles per hour`}`}><WeatherIcon name="wind" /><strong>{wind}</strong></span>
  </section>;
}
