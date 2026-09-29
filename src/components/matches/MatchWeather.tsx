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
  return <section className={styles.weather} aria-label="Match-day weather">
    <div className={styles.heading}><strong>Match-day weather</strong><span>{course?.city ? `${course.city} area` : 'Location pending'}</span></div>
    {forecast ? <>
      {forecast.condition && <div className={styles.condition}><WeatherIcon name={forecast.condition.icon} /><strong>{forecast.condition.label}</strong></div>}
      <div className={styles.metrics}>
        <span><strong>{forecast.high}° / {forecast.low}°</strong>High / low · °F</span>
        <span><strong className={styles.iconValue}><WeatherIcon name="rain" />{forecast.rain}%</strong>Rain chance</span>
        <span><strong className={styles.iconValue}><WeatherIcon name="wind" />{forecast.wind === null ? 'Unavailable' : forecast.wind === 0 ? 'Calm' : `${forecast.windDirection ? `${forecast.windDirection} · ` : ''}${forecast.wind} mph`}</strong>Typical wind · 8am–5pm</span>
      </div>
      <div className={styles.note}>Full-day forecast · Updated {new Intl.DateTimeFormat('en-US', {timeZone: WEATHER_TIME_ZONE, month: 'short', day: 'numeric'}).format(new Date(forecast.updatedAt))} · Updates daily · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></div>
    </> : <p className={styles.note}>{course?.city && course?.state ? 'Forecast temporarily unavailable. Please check again tomorrow.' : 'Forecast will appear when the course location is confirmed.'}</p>}
  </section>;
}
