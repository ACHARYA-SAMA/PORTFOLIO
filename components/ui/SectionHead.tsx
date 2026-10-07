import Reveal from "./Reveal";
import VelocitySkew from "./VelocitySkew";
import s from "./ui.module.css";

type Props = {
  index: string;
  kicker: string;
  meta?: string;
  title: string[];
  className?: string;
  titleClassName?: string;
  titleId?: string;
};

/** Mono index row + a giant uppercase title, each line clipped by its own mask. */
export default function SectionHead({ index, kicker, meta, title, className = "", titleClassName = "", titleId }: Props) {
  return (
    <header className={`${s.head} ${className}`}>
      <div className={`label ${s.headRow}`}>
        <span>{index}</span>
        <span className={s.headKicker}>{kicker}</span>
        {meta && <span className={s.headMeta}>{meta}</span>}
      </div>
      <VelocitySkew>
        <Reveal as="h2" type="lines" className={`display ${s.title} ${titleClassName}`} id={titleId}>
          {title.map((line) => (
            <span key={line} className={s.titleLine}>
              {line}
            </span>
          ))}
        </Reveal>
      </VelocitySkew>
    </header>
  );
}
