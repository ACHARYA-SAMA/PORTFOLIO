import TransitionLink from "@/components/TransitionLink";
import { ABOUT_COPY, CHANNELS, CONTACT, PERSON, PROJECTS, RACES, RACE_INTRO, RADIO } from "@/lib/content";
import { PORTFOLIO } from "@/lib/routes";
import PrintButton from "./PrintButton";
import s from "./cv.module.css";

/** Italic markers are styling on the site; on paper they are just words. */
const plain = (text: string) => text.replace(/\*/g, "");

/**
 * One-page CV generated from the same data modules as the site.
 * On screen it is a paper sheet on the ink desk; in print it is the sheet alone (A4).
 */
export default function CvSheet() {
  return (
    <article className={s.desk} data-theme="ink" aria-labelledby="cv-title">
      <div className={`label ${s.bar}`}>
        <TransitionLink href={PORTFOLIO} label="Arman" className={s.back} data-cursor="BACK">
          ← Portfolio
        </TransitionLink>
        <span>Curriculum vitae · A4</span>
        <PrintButton className={s.print} />
      </div>

      <div className={s.sheet} data-print-root="">
        <header className={s.head}>
          <div>
            <h1 id="cv-title" className={`display ${s.name}`}>
              {PERSON.name}
            </h1>
            <p className={s.sub}>
              <span className="label">{PERSON.programme}</span>
              <span className="label">{PERSON.institute}</span>
              <span className="label">{PERSON.base}</span>
            </p>
          </div>
          <dl className={`label ${s.contact}`}>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </dd>
            </div>
            <div>
              <dt>LinkedIn</dt>
              <dd>
                <a href={CONTACT.linkedin.href}>{CONTACT.linkedin.label}</a>
              </dd>
            </div>
            <div>
              <dt>GitHub</dt>
              <dd>
                <a href={CONTACT.github.href}>{CONTACT.github.label}</a>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{PERSON.status}</dd>
            </div>
          </dl>
        </header>

        <section className={s.profile} aria-labelledby="cv-profile">
          <h2 id="cv-profile" className={`label ${s.h}`}>
            Profile
          </h2>
          {ABOUT_COPY.map((p, i) => (
            <p key={i}>{plain(p)}</p>
          ))}
        </section>

        <div className={s.cols}>
          <div>
            <section aria-labelledby="cv-projects">
              <h2 id="cv-projects" className={`label ${s.h}`}>
                Projects
              </h2>
              <ul className={s.list}>
                {PROJECTS.map((p) => (
                  <li key={p.id}>
                    <b>{p.title}</b>
                    {p.line ? <span> {p.line}</span> : null}
                    <span className={`label ${s.tags}`}>{p.tags.join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div>
            <section aria-labelledby="cv-roles">
              <h2 id="cv-roles" className={`label ${s.h}`}>
                Roles
              </h2>
              <ul className={s.list}>
                {RADIO.map((r) => (
                  <li key={r.org}>
                    <b>
                      {r.org}, {r.orgDetail}
                    </b>
                    <span> {r.role}</span> <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="cv-races">
              <h2 id="cv-races" className={`label ${s.h}`}>
                Hackathons &amp; competition
              </h2>
              <p className={s.intro}>{RACE_INTRO}</p>
              <ul className={s.list}>
                {RACES.map((r) => (
                  <li key={r.id}>
                    <b>{r.name}</b> <span className={`label ${s.tags}`}>{r.kind}</span>
                    <span> {r.result}</span>
                    {r.detail ? <span> {r.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="cv-skills">
              <h2 id="cv-skills" className={`label ${s.h}`}>
                Skills
              </h2>
              <dl className={s.skills}>
                {CHANNELS.map((c) => (
                  <div key={c.name}>
                    <dt className="label">{c.name}</dt>
                    <dd>{c.nodes.map((n) => (n.note ? `${n.label} (${n.note})` : n.label)).join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
}
