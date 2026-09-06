import { useMediaQuery } from "./use-media-query";

// Matches Tailwind's `md:` breakpoint, since this hook exists to swap
// components at the same cutoff `md:hidden`/`md:flex` classes use elsewhere.
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}
