import { CHANNELS, CONTACT, PERSON } from "./content";

/**
 * Absolute origin for canonical URLs, OG images and the sitemap.
 * TODO: set NEXT_PUBLIC_SITE_URL to the production domain. On Vercel the
 * production URL is picked up automatically; elsewhere it falls back to localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_TITLE = "Arman Acharya (Raj): Frontend, Computer Vision, Design";
export const SITE_DESCRIPTION =
  "Arman Acharya, B.Tech CSE (Data Science) at MLR Institute of Technology, Hyderabad. Frontend developer, designer, computer-vision tinkerer and state-level karate champion.";

/** schema.org Person, built only from facts already on the site. */
export const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: PERSON.name,
  alternateName: PERSON.callsign,
  description: SITE_DESCRIPTION,
  url: `${SITE_URL}/portfolio`,
  email: `mailto:${CONTACT.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Hyderabad", addressCountry: "IN" },
  affiliation: { "@type": "CollegeOrUniversity", name: "MLR Institute of Technology" },
  knowsAbout: CHANNELS.flatMap((c) => c.nodes.map((n) => n.label)),
  sameAs: [CONTACT.linkedin.href, CONTACT.github.href],
};

/** JSON for a <script type="application/ld+json">, with `<` escaped so it can never close the tag. */
export const jsonLdHtml = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
