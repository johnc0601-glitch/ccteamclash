import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { HeaderAccessProvider } from "@/components/HeaderAccessProvider";
import { PwaLifecycle } from "@/components/PwaLifecycle";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/shared/constants";
import "./globals.css";
import "./theme.css";
import "./header.css";
import "./canonical-theme.css";
import "./matchday-theme.css";
import "./responsive-header-fix.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ccteamclash.com"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Team Clash",
  appleWebApp: {
    capable: true,
    title: "Team Clash",
    statusBarStyle: "black",
  },
  icons: {
    icon: "/pwa/team-clash-app-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090b0c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaLifecycle />
        <HeaderAccessProvider>
          {children}
        </HeaderAccessProvider>
        <Analytics />
      </body>
    </html>
  );
}
