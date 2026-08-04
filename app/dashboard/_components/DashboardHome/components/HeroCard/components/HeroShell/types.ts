import type { ReactNode } from "react";

export type HeroShellProps = {
  className?: string;
  href: string;
  heading: string;
  subheading?: string;
  ctaLabel?: string;
  children?: ReactNode;
};
