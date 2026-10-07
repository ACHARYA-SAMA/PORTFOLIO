import TransitionLink from "@/components/TransitionLink";
import s from "./nav.module.css";

type Props = { href: string; label: string; sup?: string; active?: boolean; home?: boolean };

/** Text rolls up, a second copy rolls in from below. Off the home page it drops the shutter first. */
export default function NavLink({ href, label, sup, active = false, home = true }: Props) {
  if (!home) {
    return (
      <TransitionLink href={`/${href}`} label={label} className={`label ${s.link}`}>
        <span className={s.roll}>
          <span>{label}</span>
          <span aria-hidden="true">{label}</span>
        </span>
        {sup && <sup className={s.sup}>{sup}</sup>}
      </TransitionLink>
    );
  }
  return (
    <a href={href} className={`label ${s.link}`} aria-current={active ? "true" : undefined}>
      <span className={s.roll}>
        <span>{label}</span>
        <span aria-hidden="true">{label}</span>
      </span>
      {sup && <sup className={s.sup}>{sup}</sup>}
      <i className={s.dot} aria-hidden="true" />
    </a>
  );
}
