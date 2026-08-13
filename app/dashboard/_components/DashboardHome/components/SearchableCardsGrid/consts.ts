import type { SearchableCardDefinition } from "./types";

// HeroCard is excluded — it's a CTA banner with no title text, so it can
// never match a search term.
export const SEARCHABLE_CARDS: SearchableCardDefinition[] = [];
