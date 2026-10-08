import type { Metadata } from "next";
import { InlineScript } from "@/components/InlineScript";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Cursor from "@/components/Cursor";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import CommandPalette from "@/components/CommandPalette";
import Toast from "@/components/Toast";
import KonamiEgg from "@/components/KonamiEgg";
import SiteShortcuts from "@/components/shortcuts/SiteShortcuts";
import { jsonLdHtml, PERSON_JSON_LD, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/portfolio" },
  // Nested openGraph replaces the parent's, so it is spelled out in full.
  openGraph: { type: "profile", url: "/portfolio", siteName: "Arman Acharya", title: SITE_TITLE, description: SITE_DESCRIPTION, locale: "en_IN" },
};

// Skip the loader on repeat visits in the same session, and for reduced motion.
// First thing in <body>: it runs during parsing, before anything below it can paint.
const LOADER_GATE = `try{if('scrollRestoration' in history)history.scrollRestoration='manual';var d=document.documentElement;if(sessionStorage.getItem('aa-loaded')||matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('skip-loader')}else{d.classList.add('is-loading')}}catch(e){}`;

/** The classic portfolio: smooth scroll, cursor, shutter, palette. None of it ships to the world on `/`. */
export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InlineScript html={LOADER_GATE} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(PERSON_JSON_LD) }} />
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
      <ScrollProgress />
      <PageTransition />
      <CommandPalette />
      <Toast />
      <KonamiEgg />
      <SiteShortcuts />
      <Cursor />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
