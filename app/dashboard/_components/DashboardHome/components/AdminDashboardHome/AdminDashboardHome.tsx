"use client";

import { Download } from "lucide-react";
import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import { StatValue } from "@/components/StatValue";
import { Button } from "@/components/ui/button";
import { DashboardLoader } from "@/app/dashboard/_components/DashboardLoader";
import { ADMIN_METRIC_CARDS } from "./consts";
import { useAdminMetrics } from "./hooks";

/**
 * Admin-only dashboard home — a small grid of platform-wide metric cards
 * (clubs, courts, players, reservations booked), backed by
 * GET /api/admin/metrics. Rendered by DashboardHome instead of the owner/
 * player views whenever `user.isAdmin` is true, regardless of `user.role`.
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
            >
              <StatValue
                variant="stacked"
                label=""
                value={String(metrics?.[key] ?? 0)}
              />
              {key === "totalReservations" && (
                <Button variant="outline" size="sm" className="mt-2" asChild>
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
