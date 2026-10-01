import {Suspense} from 'react';
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

export function MatchdayInfoStrip({
  matchday,
  attendance,
}: {
  matchday: PublicMatchday;
  attendance?: MatchdayAttendanceTotals;
}) {
  return (
    <section className={styles.strip} aria-label="Matchday conditions and attendance">
      <div className={styles.weather}>
        <span className={styles.label}>Conditions</span>
        <Suspense fallback={<strong className={styles.pending}>Loading forecast</strong>}>
          <WeatherSegment matchday={matchday} />
        </Suspense>
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

async function WeatherSegment({matchday}: {matchday: PublicMatchday}) {
  const today = easternDate();
  const showWeather = weatherVisible(matchday.scheduledDate, matchday.lifecycle, today);
  if (!showWeather) {
    return <strong className={styles.pending}>Forecast appears Monday</strong>;
  }

  const course = matchday.courseDetails;
  const forecast = course?.city && course?.state
    ? await getDailyMatchWeather(course.city, course.state, matchday.scheduledDate!, today)
    : null;

  if (!forecast) {
    return <strong className={styles.pending}>Weather pending</strong>;
  }

  const wind = forecast.wind === null
    ? '—'
    : forecast.wind === 0
      ? 'Calm'
      : `${forecast.windDirection === 'Variable' ? 'Var' : forecast.windDirection ?? ''} ${forecast.wind} mph`.trim();

  const updated = new Intl.DateTimeFormat('en-US', {
    timeZone: WEATHER_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(new Date(forecast.updatedAt));
  const provider = forecast.source === 'NWS' ? 'National Weather Service' : 'Open-Meteo';

  return (
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
  );
}
