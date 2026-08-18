import type { PlayerFilters, PlayerSort } from "../../types";

export type PlayersFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  filters: PlayerFilters;
  onFiltersChange: (filters: PlayerFilters) => void;
  sort: PlayerSort;
  onSortChange: (sort: PlayerSort) => void;
};
