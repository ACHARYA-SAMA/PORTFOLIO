import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { InlineScript } from "@/components/InlineScript";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Cursor from "@/components/Cursor";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import CommandPalette from "@/components/CommandPalette";
import Toast from "@/components/Toast";
import KonamiEgg from "@/components/KonamiEgg";

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

// Skip the loader on repeat visits in the same session, and for reduced motion.
const LOADER_GATE = `try{if('scrollRestoration' in history)history.scrollRestoration='manual';var d=document.documentElement;if(sessionStorage.getItem('aa-loaded')||matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('skip-loader')}else{d.classList.add('is-loading')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={LOADER_GATE} />
      </head>
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <ScrollProgress />
        <PageTransition />
        <CommandPalette />
        <Toast />
        <KonamiEgg />
        <Cursor />
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
