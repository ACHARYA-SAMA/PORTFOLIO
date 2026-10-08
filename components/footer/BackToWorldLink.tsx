import s from "./trophies.module.css";

/**
 * Small mono way back into the world. `?world=1` lets it through even when
 * "skip intro next time" is on. A plain link: the world is a different bundle.
 */
export default function BackToWorldLink({ className = "" }: { className?: string }) {
  return (
    <a href="/?world=1" className={`label ${s.world} ${className}`} data-cursor="DRIVE">
      <span className={s.worldDot} aria-hidden="true" />
      Back to world ↗
    </a>
  );
}
