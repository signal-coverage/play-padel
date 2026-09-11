"use client";

import { Download } from "lucide-react";
import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import { StatValue } from "@/components/StatValue";
import { Button } from "@/components/ui/button";
import { DashboardLoader } from "@/app/dashboard/_components/DashboardLoader";
import { ADMIN_METRIC_CARDS, CLUB_BREAKDOWN_ROWS } from "./consts";
import { useAdminMetrics } from "./hooks";

/**
 * Admin-only platform overview — a small grid of platform-wide metric cards
 * (clubs, courts, players, reservations booked), backed by
 * GET /api/admin/metrics. Reached from the Admin dropdown's "Overview" item
 * (app/dashboard/admin-overview/page.tsx) — NOT rendered in place of the
 * normal dashboard anymore (see DashboardHome.tsx's own comment on why that
 * changed: an admin who's also a player/owner needs to keep seeing their
 * own dashboard).
 */
export function AdminDashboardHome() {
  const { data: metrics, isLoading, isError } = useAdminMetrics();

  if (isLoading) return <DashboardLoader />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Platform Overview
      </h1>

      {isError ? (
        <p className="text-sm text-destructive">
          Could not load platform metrics. Try again later.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {ADMIN_METRIC_CARDS.map(({ key, label, animationDelay }) => (
            <DashboardBentoCard
              key={key}
              title={label}
              animationDelay={animationDelay}
              // flex-1 (not just flex-col) so this card's content area
              // stretches to the card's full height — Cards in the same
              // grid row already stretch to match their tallest sibling
              // (CSS Grid's default item alignment), so without this the
              // Export CSV button's own mt-auto below would have no actual
              // leftover space to push into.
              contentClassName="flex flex-1 flex-col"
            >
              {key === "totalClubs" ? (
                <div className="flex flex-col gap-1">
                  {CLUB_BREAKDOWN_ROWS.map((row) => (
                    <StatValue
                      key={row.key}
                      variant="row"
                      label={row.label}
                      value={String(metrics?.[row.key] ?? 0)}
                      valueClassName="text-sm"
                    />
                  ))}
                  <div className="mt-1 border-t border-border pt-1">
                    <StatValue
                      variant="row"
                      label="Total"
                      value={String(metrics?.totalClubs ?? 0)}
                      valueClassName="text-base font-semibold"
                    />
                  </div>
                </div>
              ) : (
                <StatValue
                  variant="stacked"
                  label=""
                  value={String(metrics?.[key] ?? 0)}
                />
              )}
              {key === "totalReservations" && (
                // mt-auto (main axis, within the now flex-1/flex-col
                // CardContent) pushes it to the bottom; self-end (cross
                // axis) pushes it to the right.
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto self-end"
                  asChild
                >
                  <a href="/api/admin/export/reservations" download>
                    <Download size={14} strokeWidth={2.25} />
                    Export CSV
                  </a>
                </Button>
              )}
            </DashboardBentoCard>
          ))}
        </div>
      )}
    </div>
  );
}
