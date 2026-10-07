"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/hooks";
import { transition } from "@/lib/store";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; label: string; children: ReactNode };

/** A link that drops the shutter (painted with `label`) before the route changes. */
export default function TransitionLink({ href, label, children, onClick, ...rest }: Props) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (prefersReducedMotion()) {
      window.location.assign(href);
      return;
    }
    transition.set({ label, phase: "cover", href });
  };
  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
