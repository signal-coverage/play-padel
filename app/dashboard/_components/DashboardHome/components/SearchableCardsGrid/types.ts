import type { ComponentType } from "react";
import type { SystemRole } from "@/providers/auth-provider";

export type CardProps = { role: SystemRole; className?: string };

export type SearchableCardDefinition = {
  // Looked up under the "SearchableCardsGrid" translation namespace (see
  // SearchableCardsGrid.tsx) both for display and for the search-query
  // match — never a raw rendered/matched string itself, so it stays a
  // stable English identifier regardless of locale.
  key: string;
  Component: ComponentType<CardProps>;
};

export type SearchableCardsGridProps = {
  role: SystemRole;
  query: string;
  onClearSearch: () => void;
  className?: string;
};
