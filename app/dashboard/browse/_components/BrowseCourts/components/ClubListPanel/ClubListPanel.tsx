"use client";

import { useMemo } from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import { cn } from "@/lib/utils/utils";
import { filterClubs, sortClubs } from "./utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { ClubBrowseSummary } from "../../types";
import type { ClubListPanelProps } from "./types";
import type { ClubSort, ClubSortField } from "./utils";

export function ClubListPanel({
  clubs,
  selectedClubId,
  onSelectClub,
  isLoading,
  isError,
}: ClubListPanelProps) {
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
        header: "Club",
        headerClassName: "pl-3",
        className: "px-2",
        cell: (club) => (
          <button
            type="button"
            onClick={() => onSelectClub(club.id)}
            aria-pressed={club.id === selectedClubId}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              club.id === selectedClubId && "bg-muted",
              !club.hasAvailabilityToday && "opacity-50",
            )}
          >
            <Avatar>
              {club.logoUrl && <AvatarImage src={club.logoUrl} alt="" />}
              <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{club.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <Badge variant="outline">
                  {club.courtCount} {club.courtCount === 1 ? "court" : "courts"}
                </Badge>
                <Badge
                  variant={club.hasAvailabilityToday ? "success" : "secondary"}
                >
                  {club.hasAvailabilityToday
                    ? "Available today"
                    : "No availability"}
                </Badge>
              </div>
            </div>
          </button>
        ),
      },
    ],
    [selectedClubId, onSelectClub],
  );

  if (isError) {
    return (
      <StatusBox className="flex h-full flex-col items-center justify-center">
        Could not load clubs. Try again later.
      </StatusBox>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clubs..."
          className="pl-8"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Select
          value={sort.field}
          onValueChange={(value) => setSortField(value as ClubSortField)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="courtCount">Court count</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={
            sort.direction === "asc"
              ? "Sort ascending, click to sort descending"
              : "Sort descending, click to sort ascending"
          }
          onClick={() =>
            setSortDirection(sort.direction === "asc" ? "desc" : "asc")
          }
        >
          {sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTable
          className="h-full"
          columns={columns}
          rows={visibleClubs}
          rowKey={(club) => club.id}
          isLoading={isLoading}
          loadingLabel="Loading clubs…"
          emptyState={<StatusBox>No clubs match your search.</StatusBox>}
        />
      </div>
    </div>
  );
}
