"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useQueryState, parseAsString, parseAsStringEnum } from "nuqs";
import { Image as ImageIcon } from "lucide-react";
import { ColorSwatch } from "@/components/ColorSwatch";
import { SortDirectionButton } from "@/components/SortDirectionButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import {
  indoorLabel,
  surfaceLabel,
} from "@/app/dashboard/courts/_components/CourtsView/utils";
import { cn } from "@/lib/utils/utils";
import { formatCourtPrice, formatPricePerHour } from "@/lib/utils/currency";
import {
  CARPET_SURFACE_FALLBACK_IMAGE,
  CARPET_SURFACE_IMAGE_BY_COLOR,
  CONCRETE_SURFACE_IMAGE,
} from "./consts";
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
  const [previewCourt, setPreviewCourt] = useState<CourtColumn | null>(null);

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
        cell: (court) => {
          // Real per-color renders exist for the ColorField presets; any
          // other (custom-picked) color falls back to the neutral render,
          // tinted at render time instead of pixel-perfect.
          const presetImage = court.color
            ? CARPET_SURFACE_IMAGE_BY_COLOR[court.color.toLowerCase()]
            : undefined;

          return (
            <div className="flex flex-col gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 w-fit">
                    <ColorSwatch color={court.color} />
                    <span className="w-fit">{surfaceLabel(court.surface)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="border bg-popover text-popover-foreground p-2">
                  {court.surface === "carpet" ? (
                    <div className="relative h-24 w-24 overflow-hidden rounded-xs">
                      <Image
                        src={presetImage ?? CARPET_SURFACE_FALLBACK_IMAGE}
                        alt=""
                        fill
                        className="object-cover"
                      />
                      {/* Only the fallback render needs a CSS tint — the
                          presets above are already pixel-perfect for their
                          exact color, so tinting on top would double up the
                          color. `mix-blend-mode: color` takes this overlay's
                          hue/saturation while keeping the photo's own
                          luminosity; the color itself is muted via
                          `color-mix` in OKLCH (reduces chroma, keeps hue
                          stable) for a matte look instead of the raw,
                          fully-saturated picker color. */}
                      {!presetImage && (
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: `color-mix(in oklch, ${court.color ?? "#94a3b8"} 60%, gray)`,
                            mixBlendMode: "color",
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  ) : court.surface === "concrete" ? (
                    <div className="relative h-24 w-24 overflow-hidden rounded-xs">
                      <Image
                        src={CONCRETE_SURFACE_IMAGE}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xs bg-muted">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        },
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-fit text-muted-foreground underline decoration-dotted underline-offset-2">
                See preview
              </span>
            </TooltipTrigger>
            <TooltipContent className="border bg-popover text-popover-foreground p-2">
              <button
                type="button"
                onClick={(e) => {
                  // Radix portals this content to document.body, but React
                  // still re-dispatches the click through the component
                  // tree — without this it'd also bubble to the row's
                  // onClick and select the court as a side effect.
                  e.stopPropagation();
                  setPreviewCourt(court);
                }}
                aria-label={`See a bigger preview of ${court.name}`}
                className="flex h-24 w-24 items-center justify-center rounded-xs bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {court.photoUrl ? (
                  // Arbitrary owner-uploaded Vercel Blob URLs aren't known
                  // ahead of time, so next/image's remotePatterns allowlist
                  // doesn't fit here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={court.photoUrl}
                    className="h-full w-full rounded-xs object-cover"
                    alt=""
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </TooltipContent>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  if (!selectedClubId) {
    return (
      <StatusBox className="flex h-full flex-col items-center justify-center">
        Select a club to see its courts.
      </StatusBox>
    );
  }

  if (isError) {
    return (
      <StatusBox className="flex h-full flex-col items-center justify-center">
        Could not load courts. Try again later.
      </StatusBox>
    );
  }

  if (!isLoading && courts.length === 0) {
    return (
      <StatusBox className="flex h-full flex-col items-center justify-center">
        No courts available for the selected date.
      </StatusBox>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
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
          emptyState={<StatusBox>No courts match your filters.</StatusBox>}
          onRowClick={(court) => onSelectCourt(court.id)}
          isRowSelected={(court) => court.id === selectedCourtId}
        />
      </div>

      <Dialog
        open={!!previewCourt}
        onOpenChange={(open) => !open && setPreviewCourt(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewCourt?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-128 w-full items-center justify-center rounded-sm bg-muted">
            {previewCourt?.photoUrl ? (
              // Arbitrary owner-uploaded Vercel Blob URLs aren't known
              // ahead of time, so next/image's remotePatterns allowlist
              // doesn't fit here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewCourt.photoUrl}
                className="h-full w-full rounded-xs object-cover"
                alt=""
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
