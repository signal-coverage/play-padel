"use client";

import { Download } from "lucide-react";
import { BouncingBall } from "@/components/BouncingBall";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import { CLUB_STATUS_BADGE_VARIANT } from "./consts";
import { countClubsNeedingAttention, getClubHealthWarning } from "./utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { AdminClubListItem } from "../../types";
import type { AdminClubListProps } from "./types";

// Same border/row/selected-state visual language as CourtsTable (see
// CourtsView/components/CourtsTable/CourtsTable.tsx) — built on the same
// underlying DataTable primitive, just with a single rich "Club" column
// instead of many, since this is a picker list rather than a data grid.
export function AdminClubList({
  clubs,
  isLoading,
  selectedClubId,
  onSelectClub,
}: AdminClubListProps) {
  const columns: DataTableColumn<AdminClubListItem>[] = [
    {
      key: "club",
      header: "Club",
      cell: (club) => {
        const healthWarning = getClubHealthWarning(club);
        return (
          <div className="flex flex-col gap-1 py-0.5">
            <span className="font-medium">{club.name}</span>
            <div className="flex items-center gap-1.5">
              <Badge variant={CLUB_STATUS_BADGE_VARIANT[club.status]}>
                {club.status}
              </Badge>
              <Badge variant="outline">{club.plan}</Badge>
              {healthWarning && (
                <span title={healthWarning}>
                  <BouncingBall
                    size={14}
                    amplitude={4}
                    fill="var(--destructive)"
                    stroke="color-mix(in oklch, var(--destructive) 70%, black)"
                  />
                </span>
              )}
            </div>
          </div>
        );
      },
      loadingCell: <Skeleton className="h-10 w-full" />,
    },
  ];

  const clubsNeedingAttention = countClubsNeedingAttention(clubs);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {clubsNeedingAttention > 0 ? (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <BouncingBall
              size={14}
              amplitude={4}
              fill="var(--destructive)"
              stroke="color-mix(in oklch, var(--destructive) 70%, black)"
            />
            {clubsNeedingAttention === 1
              ? "1 club needs attention"
              : `${clubsNeedingAttention} clubs need attention`}
          </p>
        ) : (
          <span />
        )}
        <Button variant="outline" size="sm" asChild>
          <a href="/api/admin/export/clubs" download>
            <Download size={14} strokeWidth={2.25} />
            Export CSV
          </a>
        </Button>
      </div>

      <DataTable
        // Same fix as PlayersDirectory's table
        // (app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx)
        // — see its own comments for the full explanation. <main>
        // (DashboardShell.tsx) is overflow-y-auto (whole-page scroll) below
        // md, not md:overflow-hidden, so the h-full/flex-1 chain this table
        // normally stretches against collapses there; min-h-[60svh] doesn't
        // depend on that chain, md:min-h-0 restores the exact previous
        // desktop sizing.
        className="min-h-[60svh] flex-1 md:min-h-0"
        columns={columns}
        rows={clubs}
        rowKey={(club) => club.id}
        isLoading={isLoading}
        loadingLabel="Loading clubs…"
        emptyState={<StatusBox>No clubs found.</StatusBox>}
        onRowClick={(club) => onSelectClub(club.id)}
        isRowSelected={(club) => club.id === selectedClubId}
      />

      {/* Real spacer box (height, not margin/padding), mobile only — see
          PlayersDirectory.tsx's identical spacer for the full explanation
          of why margin/padding on the table itself doesn't work here. */}
      <div className="h-8 shrink-0 md:hidden" aria-hidden="true" />
    </div>
  );
}
