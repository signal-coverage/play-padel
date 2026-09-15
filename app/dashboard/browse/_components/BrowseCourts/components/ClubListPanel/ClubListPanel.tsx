"use client";

import { useMemo } from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SortDirectionButton } from "@/components/SortDirectionButton";
import { SearchInput } from "@/components/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { getInitials } from "@/lib/utils/initials";
import { cn } from "@/lib/utils/utils";
import { filterClubs, sortClubs } from "./utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { ClubBrowseSummary } from "../../types";
import type { ClubListPanelProps } from "./types";
import type { ClubSort, ClubSortField } from "./utils";

export function ClubListPanel({
  clubs,
  selectedClubSlug,
  onSelectClub,
  isLoading,
  isError,
}: ClubListPanelProps) {
  const t = useTranslations("ClubListPanel");
  // Filter/sort state lives in the URL (like `club`/`court`/`date` in
  // BrowseCourts) so the current search/sort is shareable and survives a
  // refresh, per the feature spec.
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));
  const [sortField, setSortField] = useQueryState(
    "clubSort",
    parseAsStringEnum<ClubSortField>(["name", "courtCount"]).withDefault(
      "name",
    ),
  );
  const [sortDirection, setSortDirection] = useQueryState(
    "clubSortDir",
    parseAsStringEnum<"asc" | "desc">(["asc", "desc"]).withDefault("asc"),
  );
  const sort: ClubSort = useMemo(
    () => ({ field: sortField, direction: sortDirection }),
    [sortField, sortDirection],
  );

  const visibleClubs = useMemo(() => {
    const filtered = filterClubs(clubs, query);
    return sortClubs(filtered, sort);
  }, [clubs, query, sort]);

  const columns: DataTableColumn<ClubBrowseSummary>[] = useMemo(
    () => [
      {
        key: "club",
        header: t("club"),
        headerClassName: "pl-3",
        className: "px-2",
        cell: (club) => (
          <button
            type="button"
            onClick={() => onSelectClub(club.slug)}
            aria-pressed={club.slug === selectedClubSlug}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              club.slug === selectedClubSlug && "bg-muted",
              !club.hasAvailabilityToday && "opacity-50",
            )}
          >
            <Avatar>
              {club.ownerPhotoUrl && (
                <AvatarImage src={club.ownerPhotoUrl} alt="" />
              )}
              <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{club.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <Badge variant="outline">
                  {t("courtCount", { count: club.courtCount })}
                </Badge>
                <Badge
                  variant={club.hasAvailabilityToday ? "success" : "secondary"}
                >
                  {club.hasAvailabilityToday
                    ? t("availableToday")
                    : t("noAvailability")}
                </Badge>
              </div>
            </div>
          </button>
        ),
      },
    ],
    [t, selectedClubSlug, onSelectClub],
  );

  if (isError) {
    return (
      <StatusBox className="flex h-full flex-col items-center justify-center">
        {t("loadError")}
      </StatusBox>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Same-row treatment as ClubCourtsPanel's Filters/Sort by pair (and
          the invisible spacer CourtSchedulePanel mirrors from it): keeping
          this to one control row, instead of stacking search above sort,
          keeps all three BrowseCourts columns reserving the same header
          height so their tables/grid line up and fill the rest evenly. */}
      <div className="flex flex-col flex-wrap items-start gap-3 justify-between">
        <div className="flex flex-col gap-1.5 w-full">
          <span className="text-xs font-medium text-muted-foreground">
            {t("sortBy")}
          </span>
          <div className="flex items-center gap-1.5 w-full">
            <Select
              value={sort.field}
              onValueChange={(value) => setSortField(value as ClubSortField)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t("sortName")}</SelectItem>
                <SelectItem value="courtCount">
                  {t("sortCourtCount")}
                </SelectItem>
              </SelectContent>
            </Select>
            <SortDirectionButton
              direction={sort.direction}
              onToggle={() =>
                setSortDirection(sort.direction === "asc" ? "desc" : "asc")
              }
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 w-full">
          <span className="text-xs font-medium text-muted-foreground">
            {t("clubsList")}
          </span>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("searchPlaceholder")}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTable
          className="h-full bg-card"
          columns={columns}
          rows={visibleClubs}
          rowKey={(club) => club.id}
          isLoading={isLoading}
          loadingLabel={t("loading")}
          emptyState={
            <StatusBox className="flex h-full flex-col items-center justify-center">
              {t("noMatches")}
            </StatusBox>
          }
        />
      </div>
    </div>
  );
}
