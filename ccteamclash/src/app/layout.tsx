import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CC Team Clash | Disc Golf League",
  description: "Stories, schedules, standings, and teams from Cape Fear Team Clash.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
