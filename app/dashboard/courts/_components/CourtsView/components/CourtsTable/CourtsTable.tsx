"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, CalendarOff, Pencil, Trash2 } from "lucide-react";
import { ColorSwatch } from "@/components/ColorSwatch";
import { CourtPhotoPreview } from "@/components/CourtPhotoPreview";
import { DataTable } from "@/components/DataTable";
import { SurfacePreview } from "@/components/SurfacePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCourtPrice } from "@/lib/utils/currency";
import { indoorLabel, surfaceLabel } from "../../utils";
import { CourtsEmptyState } from "./components/CourtsEmptyState";
import type { DataTableColumn } from "@/components/DataTable";
import type { CourtRecord } from "../../types";
import type { CourtsTableProps } from "./types";

export function CourtsTable({
  courts,
  isLoading,
  onEdit,
  onEditAvailability,
  onEditClosures,
  onDelete,
  deletingCourtId,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  className,
}: CourtsTableProps) {
  const t = useTranslations("CourtsTable");
  const tLabels = useTranslations("CourtLabels");
  const allSelected = courts.length > 0 && selectedIds.size === courts.length;

  const columns: DataTableColumn<CourtRecord>[] = useMemo(
    () => [
      {
        key: "select",
        header: (
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label={t("selectAll")}
          />
        ),
        cell: (court) => (
          <Checkbox
            checked={selectedIds.has(court.id)}
            onCheckedChange={() => onToggleSelect(court.id)}
            aria-label={t("selectOne", { name: court.name })}
          />
        ),
        loadingCell: <Skeleton className="h-4 w-4" />,
      },
      {
        key: "name",
        header: t("name"),
        className: "font-medium",
        cell: (court) => (
          <span className="flex items-center gap-2">
            <ColorSwatch color={court.color} />
            {court.name}
          </span>
        ),
        loadingCell: <Skeleton className="h-4 w-32" />,
      },
      {
        key: "surface",
        header: t("surface"),
        cell: (court) => (
          <span className="flex items-center gap-1.5">
            {surfaceLabel(court.surface, tLabels)}
            <SurfacePreview surface={court.surface} color={court.color} />
          </span>
        ),
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "preview",
        header: t("preview"),
        cell: (court) => (
          <CourtPhotoPreview
            photoUrl={court.photoUrl}
            courtName={court.name}
            size="sm"
          />
        ),
        loadingCell: <Skeleton className="h-10 w-10 rounded-xs" />,
      },
      {
        key: "type",
        header: t("type"),
        cell: (court) => indoorLabel(court.indoor, tLabels),
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "reservationFee",
        header: t("reservationFee"),
        cell: (court) =>
          court.reservationFee !== undefined
            ? formatCourtPrice(court.reservationFee)
            : "—",
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "courtPrice",
        header: t("courtPrice"),
        cell: (court) =>
          court.courtPrice !== undefined
            ? formatCourtPrice(court.courtPrice)
            : "—",
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "minShift",
        header: t("minShift"),
        cell: (court) =>
          t("minShiftValue", { minutes: court.slotDurationMinutes }),
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "status",
        header: t("status"),
        cell: (court) => (
          <Badge variant={court.active ? "default" : "secondary"}>
            {court.active ? t("active") : t("inactive")}
          </Badge>
        ),
        loadingCell: <Skeleton className="h-5 w-16 rounded-full" />,
      },
      {
        key: "actions",
        header: t("actions"),
        headerClassName: "text-right",
        className: "text-right",
        cell: (court) => (
          <div className="flex justify-end gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("editAvailabilityFor", { name: court.name })}
                  onClick={() => onEditAvailability(court)}
                >
                  <CalendarClock />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("editAvailability")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("manageClosuresFor", { name: court.name })}
                  onClick={() => onEditClosures(court)}
                >
                  <CalendarOff />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("manageClosures")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("editFor", { name: court.name })}
                  onClick={() => onEdit(court)}
                >
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("editCourt")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("deactivateFor", { name: court.name })}
                  disabled={!court.active || deletingCourtId === court.id}
                  onClick={() => onDelete(court)}
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("deactivateCourt")}</TooltipContent>
            </Tooltip>
          </div>
        ),
        loadingCell: (
          <div className="flex justify-end gap-1.5">
            <Skeleton className="h-8 w-8 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-sm" />
          </div>
        ),
      },
    ],
    [
      t,
      tLabels,
      onEdit,
      onEditAvailability,
      onEditClosures,
      onDelete,
      deletingCourtId,
      allSelected,
      selectedIds,
      onToggleSelect,
      onToggleSelectAll,
    ],
  );

  return (
    <DataTable
      className={className}
      columns={columns}
      rows={courts}
      rowKey={(court) => court.id}
      isLoading={isLoading}
      loadingLabel={t("loading")}
      emptyState={<CourtsEmptyState />}
      isRowSelected={(court) => selectedIds.has(court.id)}
    />
  );
}
