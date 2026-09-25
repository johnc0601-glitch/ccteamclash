import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { HeaderAccessProvider } from "@/components/HeaderAccessProvider";
import { PwaLifecycle } from "@/components/PwaLifecycle";
import { AppBottomNav } from "@/components/AppBottomNav";
import { AppConnectivityBanner } from "@/components/AppConnectivityBanner";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/shared/constants";
import "./globals.css";
import "./theme.css";
import "./header.css";
import "./canonical-theme.css";
import "./matchday-theme.css";
import "./responsive-header-fix.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ccteamclash.com";
const IS_APP_SURFACE = process.env.NEXT_PUBLIC_APP_SURFACE === "true";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    apple: "/pwa/team-clash-app-icon-192.png",
  },
  robots: IS_APP_SURFACE
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : undefined,
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
          <AppConnectivityBanner />
          <AppBottomNav />
        </HeaderAccessProvider>
        <Analytics />
      </body>
    </html>
  );
}
