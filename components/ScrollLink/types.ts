import type { ReactNode } from "react";

export interface ScrollLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  /** Runs after the smooth-scroll/navigation logic (e.g. closing a Sheet). */
  onNavigate?: () => void;
}
