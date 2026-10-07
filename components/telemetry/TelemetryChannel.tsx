import type { ChannelNode } from "@/lib/content";
import { pad } from "@/lib/format";
import s from "./telemetry.module.css";

const WIDTH = 1200;
const HEIGHT = 64;

/** Deterministic noise so server and client draw the same trace. */
function seeded(seed: number) {
  let t = seed * 9301 + 49297;
  return () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}

/** Two identical periods side by side, so translating by -50% loops seamlessly. */
function wavePath(seed: number) {
  const rand = seeded(seed + 1);
  const step = 10;
  const half: number[] = [];
  for (let x = 0; x <= WIDTH; x += step) {
    const burst = Math.sin((x / WIDTH) * Math.PI * 2 * (2 + (seed % 3))) * 6;
    half.push(HEIGHT / 2 + burst * rand() + (rand() - 0.5) * 7);
  }
  half[half.length - 1] = half[0];
  const pts = [...half, ...half.slice(1)].map((y, i) => `${i * step} ${y.toFixed(1)}`);
  return `M${pts.join("L")}`;
}

type Props = { index: number; name: string; nodes: ChannelNode[] };

export default function TelemetryChannel({ index, name, nodes }: Props) {
  return (
    <div className={s.channel} data-channel="">
      <div className={s.chLabel}>
        <span className="label">CH {pad(index + 1)}</span>
        <span className={`display ${s.chName}`}>{name}</span>
      </div>

      <div className={s.trace}>
        <svg className={s.carrier} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          <g className={s.wave} style={{ animationDuration: `${7 + index * 1.3}s` }}>
            <path d={wavePath(index)} />
          </g>
        </svg>

        <ul className={s.nodes}>
          {nodes.map((node, j) => (
            <li key={node.label} className={s.node} style={{ left: `${((j + 1) / (nodes.length + 1)) * 100}%` }}>
              <span className={s.spike} aria-hidden="true" />
              <span className={s.dot} aria-hidden="true" />
              <span className={s.nodeText}>
                <span className={s.nodeLabel}>{node.label}</span>
                {node.note && <span className={s.nodeNote}>{node.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`label ${s.readout}`} aria-hidden="true">
        <span className={s.liveDot} />
        {pad(nodes.length)} nodes
      </div>
    </div>
  );
}
