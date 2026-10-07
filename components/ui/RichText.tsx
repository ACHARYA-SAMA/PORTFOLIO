import { Fragment, type ReactNode } from "react";

/**
 * Renders `*asterisk*` runs as <em>. Used for verbatim copy with italic emphasis.
 * Punctuation straight after an emphasised run is kept on the same line as its last word.
 */
export default function RichText({ text, emClassName }: { text: string; emClassName?: string }) {
  const chunks = text.split("*");
  const out: ReactNode[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i % 2 === 0) {
      out.push(<Fragment key={i}>{chunk}</Fragment>);
      continue;
    }
    const next = chunks[i + 1] ?? "";
    const punct = next.match(/^[^\s]+/)?.[0] ?? "";
    if (!punct) {
      out.push(
        <em key={i} className={emClassName}>
          {chunk}
        </em>,
      );
      continue;
    }
    const cut = chunk.lastIndexOf(" ") + 1;
    chunks[i + 1] = next.slice(punct.length);
    out.push(
      <Fragment key={i}>
        {cut > 0 && <em className={emClassName}>{chunk.slice(0, cut)}</em>}
        <span style={{ whiteSpace: "nowrap" }}>
          <em className={emClassName}>{chunk.slice(cut)}</em>
          {punct}
        </span>
      </Fragment>,
    );
  }
  return <>{out}</>;
}
