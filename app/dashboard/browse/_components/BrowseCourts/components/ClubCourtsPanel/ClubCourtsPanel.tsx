"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { ColorSwatch } from "@/components/ColorSwatch";
import { CourtPhotoPreview } from "@/components/CourtPhotoPreview";
import { SortDirectionButton } from "@/components/SortDirectionButton";
import { SurfacePreview } from "@/components/SurfacePreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import {
  indoorLabel,
  surfaceLabel,
} from "@/app/dashboard/courts/_components/CourtsView/utils";
import { cn } from "@/lib/utils/utils";
import { formatCourtPrice, formatPricePerHour } from "@/lib/utils/currency";
import { filterCourts, sortCourts } from "./utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { CourtColumn } from "@/components/CourtAvailabilityGrid";
import type { ClubCourtsPanelProps } from "./types";
import type { CourtFilters, CourtSort, CourtSortField } from "./utils";

function uniqueDefinedValues(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}

export function ClubCourtsPanel({
  courts,
  selectedClubId,
  selectedCourtId,
  onSelectCourt,
  isLoading,
  isUpdating,
  isError,
}: ClubCourtsPanelProps) {
  // Filter/sort state lives in the URL (like `club`/`court`/`date` in
  // BrowseCourts) so the current filters/sort are shareable and survive a
  // refresh, per the feature spec.
  const [surface, setSurface] = useQueryState(
    "surface",
    parseAsString.withDefault("all"),
  );
  const [indoor, setIndoor] = useQueryState(
    "indoor",
    parseAsStringEnum<CourtFilters["indoor"]>([
      "all",
      "indoor",
      "outdoor",
    ]).withDefault("all"),
  );
  const [color, setColor] = useQueryState(
    "color",
    parseAsString.withDefault("all"),
  );
  const [sortField, setSortField] = useQueryState(
    "courtSort",
    parseAsStringEnum<CourtSortField>([
      "name",
      "surface",
      "reservationFee",
    ]).withDefault("name"),
  );
  const [sortDirection, setSortDirection] = useQueryState(
    "courtSortDir",
    parseAsStringEnum<"asc" | "desc">(["asc", "desc"]).withDefault("asc"),
  );

  const filters: CourtFilters = useMemo(
    () => ({ surface, indoor, color }),
    [surface, indoor, color],
  );
  const sort: CourtSort = useMemo(
    () => ({ field: sortField, direction: sortDirection }),
    [sortField, sortDirection],
  );

  // Reset the middle panel's filters/sort back to defaults whenever the
  // selected club changes, so switching clubs doesn't carry over filters
  // that may no longer make sense for the new club's courts. This replaces
  // the previous `key={clubId}` remount hack now that this state lives in
  // the URL (a remount would just snap the URL back to the old values).
  const previousClubIdRef = useRef(selectedClubId);
  useEffect(() => {
    if (previousClubIdRef.current === selectedClubId) return;
    previousClubIdRef.current = selectedClubId;
    setSurface(null);
    setIndoor(null);
    setColor(null);
    setSortField(null);
    setSortDirection(null);
  }, [
    selectedClubId,
    setSurface,
    setIndoor,
    setColor,
    setSortField,
    setSortDirection,
  ]);

  const surfaceOptions = useMemo(
    () => uniqueDefinedValues(courts.map((c) => c.surface)),
    [courts],
  );
  const colorOptions = useMemo(
    () => uniqueDefinedValues(courts.map((c) => c.color)),
    [courts],
  );

  const visibleCourts = useMemo(() => {
    const filtered = filterCourts(courts, filters);
    return sortCourts(filtered, sort);
  }, [courts, filters, sort]);

  function updateFilter<K extends keyof CourtFilters>(
    key: K,
    value: CourtFilters[K],
  ) {
    if (key === "surface") setSurface(value as string);
    else if (key === "indoor") setIndoor(value as CourtFilters["indoor"]);
    else if (key === "color") setColor(value as string);
  }

  const columns: DataTableColumn<CourtColumn>[] = useMemo(
    () => [
      {
        key: "court",
        header: "Court",
        className: "pl-3",
        cell: (court) => <span className="font-medium">{court.name}</span>,
      },
      {
        key: "surfaceColor",
        header: "Surface & Color",
        cell: (court) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 w-fit">
              <ColorSwatch color={court.color} />
              <span className="w-fit">{surfaceLabel(court.surface)}</span>
              <SurfacePreview surface={court.surface} color={court.color} />
            </div>
          </div>
        ),
      },
      {
        key: "reservationFee",
        header: "Reservation fee",
        cell: (court) =>
          court.reservationFee !== undefined
            ? formatCourtPrice(court.reservationFee)
            : "—",
      },
      {
        key: "courtPrice",
        header: "Court price",
        cell: (court) => {
          if (court.courtPrice === undefined) return "—";
          const perHour = formatPricePerHour(
            court.courtPrice,
            court.slotDurationMinutes,
          );
          return (
            <div className="flex flex-col gap-0.5">
              <span>{formatCourtPrice(court.courtPrice)}</span>
              {perHour !== "—" && (
                <span className="text-xs text-muted-foreground">
                  {perHour}/hour
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "preview",
        header: "Preview",
        cell: (court) => (
          <CourtPhotoPreview photoUrl={court.photoUrl} courtName={court.name} />
        ),
      },
    ],
    [],
  );

  // These replace only the table area below, not the whole panel — the
  // filters/sort row above stays visible regardless of club/load/error
  // state, so this column doesn't collapse to a bare placeholder box while
  // its siblings keep their own header row.
  const statusMessage = !selectedClubId
    ? "Select a club to see its courts."
    : isError
      ? "Could not load courts. Try again later."
      : !isLoading && courts.length === 0
        ? "No courts available for the selected date."
        : null;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Filters
          </span>
          <div
            role="group"
            aria-label="Filters"
            className="flex flex-wrap items-center gap-1.5"
          >
            <Select
              value={filters.surface}
              onValueChange={(value) => updateFilter("surface", value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Surface" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All surfaces</SelectItem>
                {surfaceOptions.map((surfaceOption) => (
                  <SelectItem key={surfaceOption} value={surfaceOption}>
                    {surfaceLabel(surfaceOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.indoor}
              onValueChange={(value) =>
                updateFilter("indoor", value as CourtFilters["indoor"])
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Indoor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courts</SelectItem>
                <SelectItem value="indoor">{indoorLabel(true)}</SelectItem>
                <SelectItem value="outdoor">{indoorLabel(false)}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.color}
              onValueChange={(value) => updateFilter("color", value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All colors</SelectItem>
                {colorOptions.map((colorOption) => (
                  <SelectItem key={colorOption} value={colorOption}>
                    {colorOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Sort by
          </span>
          <div
            role="group"
            aria-label="Sort by"
            className="flex items-center gap-1.5"
          >
            <Select
              value={sort.field}
              onValueChange={(value) => setSortField(value as CourtSortField)}
            >
              <SelectTrigger className="min-w-35 w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="surface">Surface</SelectItem>
                <SelectItem value="reservationFee">Reservation fee</SelectItem>
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
      </div>

      {statusMessage ? (
        <StatusBox className="flex min-h-0 flex-1 flex-col items-center justify-center">
          {statusMessage}
        </StatusBox>
      ) : (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            // Same treatment CourtSchedulePanel/CourtAvailabilityGrid already
            // apply during a placeholder-data window on date change — this
            // panel's data can be similarly stale for a moment.
            isUpdating && "opacity-60 transition-opacity",
          )}
        >
          <DataTable
            className="h-full"
            columns={columns}
            rows={visibleCourts}
            rowKey={(court) => court.id}
            isLoading={isLoading}
            loadingLabel="Loading courts…"
            emptyState={
              <StatusBox className="flex h-full flex-col items-center justify-center">
                No courts match your filters.
              </StatusBox>
            }
            onRowClick={(court) => onSelectCourt(court.id)}
            isRowSelected={(court) => court.id === selectedCourtId}
          />
        </div>
      )}
    </div>
  );
}
