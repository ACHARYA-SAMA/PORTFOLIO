import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "Arman Acharya (Raj): Frontend, Computer Vision, Design",
  description:
    "Arman Acharya, B.Tech CSE (Data Science) at MLR Institute of Technology, Hyderabad. Frontend developer, designer, computer-vision tinkerer and state-level karate champion.",
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
      <body>{children}</body>
    </html>
  );
}
