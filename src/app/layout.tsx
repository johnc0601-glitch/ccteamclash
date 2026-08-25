import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/shared/constants";
import "./globals.css";
import "./theme.css";
import "./header.css";
import "./canonical-theme.css";
import "./matchday-theme.css";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
