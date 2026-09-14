import { useTranslations } from "next-intl";
import { SortDirectionButton } from "@/components/SortDirectionButton";
import { SearchInput } from "@/components/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildCategoryFilterOptions,
  buildDominantHandFilterOptions,
  buildPreferredSideFilterOptions,
  buildSortFieldOptions,
} from "../../consts";
import type { PlayerFilters, PlayerSortField } from "../../types";
import type { PlayersFilterBarProps } from "./types";

export function PlayersFilterBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: PlayersFilterBarProps) {
  const t = useTranslations("PlayersFilterBar");

  function updateFilter<K extends keyof PlayerFilters>(
    key: K,
    value: PlayerFilters[K],
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  const categoryOptions = buildCategoryFilterOptions(t);
  const preferredSideOptions = buildPreferredSideFilterOptions(t);
  const dominantHandOptions = buildDominantHandFilterOptions(t);
  const sortFieldOptions = buildSortFieldOptions(t);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={t("searchPlaceholder")}
        className="sm:w-64"
      />

      <Select
        value={filters.category}
        onValueChange={(value) =>
          updateFilter("category", value as PlayerFilters["category"])
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder={t("category")} />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.preferredSide}
        onValueChange={(value) =>
          updateFilter("preferredSide", value as PlayerFilters["preferredSide"])
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder={t("preferredSide")} />
        </SelectTrigger>
        <SelectContent>
          {preferredSideOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.dominantHand}
        onValueChange={(value) =>
          updateFilter("dominantHand", value as PlayerFilters["dominantHand"])
        }
      >
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder={t("dominantHand")} />
        </SelectTrigger>
        <SelectContent>
          {dominantHandOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5 sm:ml-auto">
        <Select
          value={sort.field}
          onValueChange={(value) =>
            onSortChange({ ...sort, field: value as PlayerSortField })
          }
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder={t("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            {sortFieldOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SortDirectionButton
          direction={sort.direction}
          onToggle={() =>
            onSortChange({
              ...sort,
              direction: sort.direction === "asc" ? "desc" : "asc",
            })
          }
        />
      </div>
    </div>
  );
}
