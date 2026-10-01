import type {PublicMatchday} from '@/services/matches/MatchdayService';
import {easternDate, weatherVisible, WEATHER_TIME_ZONE} from '@/services/weather/MatchWeather';
import {getDailyMatchWeather} from '@/services/weather/MatchWeatherServer';
import {WeatherIcon} from './WeatherIcon';
import styles from './MatchdayInfoStrip.module.css';

export type MatchdayAttendanceTotals = {
  yes: number;
  no: number;
  unconfirmed: number;
};

export async function MatchdayInfoStrip({
  matchday,
  attendance,
}: {
  matchday: PublicMatchday;
  attendance?: MatchdayAttendanceTotals;
}) {
  const today = easternDate();
  const showWeather = weatherVisible(matchday.scheduledDate, matchday.lifecycle, today);
  const course = matchday.courseDetails;
  const forecast = showWeather && course?.city && course?.state
    ? await getDailyMatchWeather(course.city, course.state, matchday.scheduledDate!, today)
    : null;

  const wind = forecast?.wind === null || forecast?.wind === undefined
    ? '—'
    : forecast.wind === 0
      ? 'Calm'
      : `${forecast.windDirection === 'Variable' ? 'Var' : forecast.windDirection ?? ''} ${forecast.wind} mph`.trim();

  const updated = forecast
    ? new Intl.DateTimeFormat('en-US', {
      timeZone: WEATHER_TIME_ZONE,
      month: 'short',
      day: 'numeric',
    }).format(new Date(forecast.updatedAt))
    : undefined;

  const provider = forecast?.source === 'NWS' ? 'National Weather Service' : 'Open-Meteo';

  return (
    <section className={styles.strip} aria-label="Matchday conditions and attendance">
      <div className={styles.weather}>
        <span className={styles.label}>Conditions</span>
        {forecast ? (
          <div
            className={styles.weatherItems}
            title={`${course?.city ?? 'Course'} area · Updated ${updated} · Weather data: ${provider}`}
          >
            <span className={styles.weatherItem}>
              {forecast.condition ? <WeatherIcon name={forecast.condition.icon} /> : null}
              <strong>{forecast.high}°/{forecast.low}°</strong>
            </span>
            <span className={styles.weatherItem}>
              <WeatherIcon name="rain" />
              <strong>{forecast.rain}%</strong>
            </span>
            <span className={styles.weatherItem}>
              <WeatherIcon name="wind" />
              <strong>{wind}</strong>
            </span>
          </div>
        ) : (
          <strong className={styles.pending}>
            {showWeather ? 'Weather pending' : 'Forecast appears Monday'}
          </strong>
        )}
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.attendance}>
        <span className={styles.label}>Attendance</span>
        {attendance ? (
          <div className={styles.attendanceTotals} aria-label={`${attendance.yes} yes, ${attendance.no} no, ${attendance.unconfirmed} unconfirmed`}>
            <strong>{attendance.yes} Yes</strong>
            <span>·</span>
            <strong>{attendance.no} No</strong>
            <span>·</span>
            <strong>{attendance.unconfirmed} Unconfirmed</strong>
          </div>
        ) : (
          <strong className={styles.pending}>Totals pending</strong>
        )}
      </div>
    </section>
  );
}
