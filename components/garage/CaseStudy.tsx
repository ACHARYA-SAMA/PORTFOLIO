import TransitionLink from "@/components/TransitionLink";
import Reveal from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";
import TextScramble from "@/components/ui/TextScramble";
import { PROJECTS } from "@/lib/content";
import { pad } from "@/lib/format";
import s from "./case.module.css";

/** Full case file route. Same facts as the overlay; everything not in the brief is a labelled TODO. */
export default function CaseStudy({ index }: { index: number }) {
  const project = PROJECTS[index];
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(index + 1) % PROJECTS.length];

  return (
    <article className={s.case} data-theme="ink" aria-labelledby="case-page-title">
      <div className={`label ${s.bar}`}>
        <TransitionLink href="/#garage" label="The Garage" className={s.back} data-cursor="BACK">
          ← The Garage
        </TransitionLink>
        <span>
          Case file · {pad(index + 1)} / {pad(PROJECTS.length)}
        </span>
        <span>{project.flagship ? "Flagship build" : "Also in the garage"}</span>
      </div>

      <h1 id="case-page-title" className={`display ${s.title}`}>
        <TextScramble text={project.title} />
      </h1>

      <div className={s.grid}>
        <div className={s.copy}>
          {project.line ? (
            <Reveal as="p" type="lines" className={s.line}>
              {project.line}
            </Reveal>
          ) : (
            <p className={s.line}>
              <span className={s.pending}>Write-up pending.</span>
            </p>
          )}
          <div className={s.tags}>
            {project.tags.map((t) => (
              <span key={t} className={`label ${s.chip}`}>
                {t}
              </span>
            ))}
          </div>
          <dl className={s.meta}>
            <div>
              <dt className="label">Problem</dt>
              {/* TODO: problem statement from Arman */}
              <dd className="label">TODO</dd>
            </div>
            <div>
              <dt className="label">Build</dt>
              {/* TODO: what was built, and how */}
              <dd className="label">TODO</dd>
            </div>
            <div>
              <dt className="label">Outcome</dt>
              {/* TODO: outcome, only if real */}
              <dd className="label">TODO</dd>
            </div>
          </dl>
        </div>

        {/* TODO: add media */}
        <TiltCard className={s.mediaWrap} innerClassName={`placeholder ${s.media}`} sheenClassName={s.sheen} max={6}>
          <span className={`display ${s.mediaIndex}`}>{pad(index + 1)}</span>
          <span className="placeholder__tag">
            Media slot · {project.title}
            <br />
            TODO: add media
          </span>
        </TiltCard>
      </div>

      <nav className={s.pager} aria-label="More builds">
        <TransitionLink href={`/work/${prev.id}`} label={prev.title} className={s.pagerLink} data-cursor="PREV">
          <span className="label">← Previous</span>
          <span className={`display ${s.pagerTitle}`}>{prev.title}</span>
        </TransitionLink>
        <TransitionLink href={`/work/${next.id}`} label={next.title} className={`${s.pagerLink} ${s.pagerNext}`} data-cursor="NEXT">
          <span className="label">Next →</span>
          <span className={`display ${s.pagerTitle}`}>{next.title}</span>
        </TransitionLink>
      </nav>
    </article>
  );
}
