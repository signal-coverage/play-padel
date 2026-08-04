export type LogoBadgeSize = "sm" | "md";

export interface LogoBadgeProps {
  size?: LogoBadgeSize;
  /** Extra classes for placement (e.g. margins), merged onto the badge wrapper. */
  className?: string;
}
