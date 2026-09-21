"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StatusBox } from "@/components/StatusBox";
import { AdminClubList } from "@/app/dashboard/settings/club/_components/AdminClubSettingsView/components/AdminClubList";
import { useAdminClubs } from "@/app/dashboard/settings/club/_components/AdminClubSettingsView/hooks";
import { TournamentsManager } from "../TournamentsManager";

/**
 * Admin-only tournament troubleshooting view: lists every club on the
 * platform (GET /api/admin/clubs, left column — same AdminClubList picker
 * and useAdminClubs hook AdminClubSettingsView already uses, reused here
 * rather than duplicated per this repo's SRP-per-folder convention) and
 * renders the exact same TournamentsManager an owner sees for their own
 * club, scoped to whichever club is selected via its optional `clubId` prop
 * (right column) — see TournamentsManager.tsx's own comment. Selection is
 * local component state; unlike AdminClubSettingsView this doesn't need the
 * owner-impersonation/free-plan/court-limit controls (those are Club-
 * Settings-specific) or the `?club=<slug>` URL-seeding behavior.
 */
export function AdminTournamentsView() {
  const t = useTranslations("AdminTournamentsView");
  const { data: clubs = [], isLoading } = useAdminClubs();
  const [selectedClubId, setSelectedClubId] = useState<string | undefined>(
    undefined,
  );

  return (
    <div
      data-testid="admin-tournaments-root"
      className="flex h-full min-h-0 flex-col gap-4 md:flex-row"
    >
      <div
        data-testid="admin-tournaments-list-column"
        className="w-full md:max-w-xs md:shrink-0 md:basis-[30%]"
      >
        <AdminClubList
          clubs={clubs}
          isLoading={isLoading}
          selectedClubId={selectedClubId}
          onSelectClub={setSelectedClubId}
        />
      </div>

      <div
        data-testid="admin-tournaments-detail-column"
        className="min-w-0 md:flex-1 md:basis-[70%]"
      >
        {selectedClubId ? (
          <TournamentsManager clubId={selectedClubId} />
        ) : (
          <StatusBox>{t("selectClubPlaceholder")}</StatusBox>
        )}
      </div>
    </div>
  );
}
