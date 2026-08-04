import type { Metadata } from "next";
import Script from "next/script";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/shared/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        {children}
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('cc-team-clash:theme')||'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}`}
        </Script>
      </body>
    </html>
  );
}
