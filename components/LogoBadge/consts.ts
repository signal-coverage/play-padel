import type { LogoBadgeSize } from "./types";

export const LOGO_BADGE_VARIANTS: Record<
  LogoBadgeSize,
  { wrapper: string; image?: string }
> = {
  sm: {
    wrapper:
      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white p-1.5 shadow-sm",
    image: "h-full w-full object-contain",
  },
  md: {
    wrapper:
      "inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-black/10 p-2",
  },
};
