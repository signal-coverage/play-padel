import type { ReactNode } from "react";

export type DashboardBentoCardProps = {
  title: string;
  /** CSS `animation-delay` value, e.g. `"80ms"` — matches this dashboard's existing staggered fade-up entrance convention. */
  animationDelay: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};
