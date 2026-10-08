import WorldEntry from "@/components/world/WorldEntry";
import { CONTACT, PERSON, UNMASK } from "@/lib/content";
import { PORTFOLIO, sectionHref } from "@/lib/routes";
import { jsonLdHtml, PERSON_JSON_LD, SITE_DESCRIPTION } from "@/lib/site";
import { ZONES } from "@/lib/zones";

/**
 * `/` is the playable world. The canvas is client-only, so the meaning of
 * the page is server-rendered here: visually hidden text for crawlers and
 * screen readers, and a visible <noscript> card for anyone without JS.
 */
export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(PERSON_JSON_LD) }} />
      <div className="sr-only">
        <h1>
          {PERSON.name} ({PERSON.callsign}): a portfolio you can drive
        </h1>
        <p>{SITE_DESCRIPTION}</p>
        <p>
          The same portfolio without the driving is at <a href={PORTFOLIO}>{PORTFOLIO}</a>.
        </p>
        <nav aria-label="Portfolio sections">
          <ul>
            {ZONES.map((z) => (
              <li key={z.id}>
                <a href={sectionHref(z.section)}>{z.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <noscript>
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: 24,
            textAlign: "center",
            background: "#e3170a",
            color: "#fff6ee",
          }}
        >
          <p className="display" style={{ fontSize: "clamp(48px, 12vw, 140px)", margin: 0 }}>
            {PERSON.name}
          </p>
          <p className="label" style={{ margin: 0 }}>
            {UNMASK.subline}
          </p>
          <p style={{ margin: 0, fontSize: 22, maxWidth: "34ch" }}>
            The front page is a small world you drive through, and it needs JavaScript. Everything in it is also on the regular portfolio.
          </p>
          <p className="label" style={{ display: "flex", gap: 22, margin: 0 }}>
            <a href={PORTFOLIO} style={{ color: "#fff6ee" }}>
              Portfolio
            </a>
            <a href={CONTACT.github.href} style={{ color: "#fff6ee" }}>
              GitHub
            </a>
            <a href={CONTACT.linkedin.href} style={{ color: "#fff6ee" }}>
              LinkedIn
            </a>
          </p>
        </div>
      </noscript>

      <WorldEntry />
    </main>
  );
}
