import type { ElementType, ReactNode } from "react";

export interface FadeInSectionProps {
  children: ReactNode;
  /** Wrapper tag — defaults to "div". Some sections need e.g. "p". */
  as?: ElementType;
  className?: string;
  /** Forwarded to useInView — see hooks/use-in-view.ts for defaults. */
  threshold?: number;
  rootMargin?: string;
  /**
   * Extra transition-delay in ms, for staggering siblings the way the old
   * framer-motion `transition={{ delay }}` did.
   */
  delayMs?: number;
}
