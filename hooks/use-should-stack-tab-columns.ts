import { useMediaQuery } from "./use-media-query";

// TabColumnsLayout's two-column split (each column at exactly half width)
// becomes too cramped well before the container itself runs out of room —
// at 808px or narrower it collapses to a single stacked column instead, with
// a horizontal Separator between them rather than a vertical one.
const STACK_COLUMNS_BREAKPOINT = 809;

export function useShouldStackTabColumns() {
  return useMediaQuery(`(max-width: ${STACK_COLUMNS_BREAKPOINT - 1}px)`);
}
