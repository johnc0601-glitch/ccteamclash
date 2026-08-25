import './matchday-theme.css';

export default function MatchdayLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <div data-matchday-root>{children}</div>;
}
