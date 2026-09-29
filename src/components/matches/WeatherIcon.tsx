export type WeatherIconName = 'sun' | 'cloud' | 'partly-cloudy' | 'rain' | 'storm' | 'wind' | 'snow' | 'fog';

export function WeatherIcon({name}: {name: WeatherIconName}) {
  const cloud = <path d="M7 16H6a4 4 0 1 1 1-7.87A5.5 5.5 0 0 1 17.7 8 4 4 0 0 1 18 16h-1" />;
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'sun' && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {name === 'partly-cloudy' && <><circle cx="7" cy="7" r="3" /><path d="M7 1v1M1 7h1m1-4 1 1m7-1-1 1M9 20a4 4 0 1 1 0-8 5 5 0 0 1 9-1 4.5 4.5 0 0 1 0 9Z" /></>}
    {['cloud', 'rain', 'storm', 'snow', 'fog'].includes(name) && cloud}
    {name === 'cloud' && <path d="M7 16h10" />}
    {name === 'rain' && <path d="m8 18-1 3m6-3-1 3m6-3-1 3" />}
    {name === 'storm' && <path d="m13 13-4 5h4l-2 5 6-7h-4l2-3" />}
    {name === 'wind' && <path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3" />}
    {name === 'fog' && <path d="M4 19h16M7 22h10" />}
    {name === 'snow' && <path d="M8 18v4m-2-2h4m6-2v4m-2-2h4" />}
  </svg>;
}
