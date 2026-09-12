/**
 * Small color/formatting helpers for scripts/menu.ts and scripts/actions/*
 * that @clack/prompts itself doesn't cover — everything else (banners,
 * step-by-step progress, success/error messages) goes through
 * scripts/lib/prompt.ts's clack wrappers instead.
 */

export const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

export const paint = (color: keyof typeof c, text: string) =>
  `${c[color]}${text}${c.reset}`;

/** Show which database is about to be touched, without leaking credentials. */
export function describeTarget(url: string | undefined) {
  if (!url) return paint("red", "DATABASE_URL is not set");
  try {
    const { host, pathname } = new URL(url);
    return paint("bold", `${host}${pathname}`);
  } catch {
    return paint("yellow", "unparseable DATABASE_URL");
  }
}
