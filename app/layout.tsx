import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import RouteShutter from "@/components/RouteShutter";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Arman Acharya",
  authors: [{ name: "Arman Acharya" }],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Arman Acharya", title: SITE_TITLE, description: SITE_DESCRIPTION, locale: "en_IN" },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#e3170a",
};

/** Shared by both modes: fonts and design tokens only. Each mode brings its own chrome. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
        <RouteShutter />
      </body>
    </html>
  );
}
