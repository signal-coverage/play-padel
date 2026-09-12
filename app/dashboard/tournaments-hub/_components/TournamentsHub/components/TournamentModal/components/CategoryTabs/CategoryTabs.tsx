"use client";

import { Button } from "@/components/ui/button";
import type { CategoryTabsProps } from "./types";

/**
 * Category picker shown only when a tournament has 2+ categories (see
 * TournamentModal — a single-category tournament skips this entirely).
 * Plain Button toggles, matching the owner management UI's own category
 * selector (TournamentsManager.tsx) rather than the Tabs primitive —
 * content for the selected category is rendered by TournamentModal itself.
 */
export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const selected = category.id === selectedCategoryId;
        return (
          <Button
            key={category.id}
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            onClick={() => onSelect(category.id)}
          >
            {category.name}
          </Button>
        );
      })}
    </div>
  );
}
