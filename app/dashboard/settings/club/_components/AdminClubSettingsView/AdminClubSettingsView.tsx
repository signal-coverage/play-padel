"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserRoundCog, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBox } from "@/components/StatusBox";
import { ClubSettingsView } from "../ClubSettingsView";
import { AdminClubList } from "./components/AdminClubList";
import {
  useAdminClubs,
  useClubOwner,
  useImpersonateOwner,
  useActivateFreePlan,
} from "./hooks";

/**
 * Admin-only club picker + settings view: lists every club on the platform
 * (GET /api/admin/clubs, left ~30% of the width) and renders the exact same
 * ClubSettingsView an owner sees for their own club — scoped to whichever
 * club is selected via ClubSettingsView's optional `clubId` prop, which
 * routes it through the admin-gated /api/admin/clubs/[clubId] endpoints
 * instead of the owner-only /api/clubs (right ~70%). Selection is local
 * component state, seeded from an optional `?clubId=` URL search param on
 * mount (see app/dashboard/admin-search, whose club results deep-link here)
 * — otherwise there's no precedent in this codebase for reflecting this
 * kind of in-page picker selection in the URL beyond that one entry point,
 * so nothing pushes selection changes back into the URL.
 */
export function AdminClubSettingsView() {
  const { data: clubs = [], isLoading } = useAdminClubs();
  const searchParams = useSearchParams();
  const [selectedClubId, setSelectedClubId] = useState<string | undefined>(
    () => searchParams.get("clubId") ?? undefined,
  );
  const { data: owner } = useClubOwner(selectedClubId);
  const impersonateOwner = useImpersonateOwner();
  const activateFreePlan = useActivateFreePlan();
  const selectedClub = clubs.find((club) => club.id === selectedClubId);

  function handleActivateFreePlan() {
    if (!selectedClubId || !selectedClub) return;
    // Same explicit confirmation as the legacy /admin/club-status page's
    // identical action (core/billing/services/membership.service.ts's
    // activateFreePlan) — a real, if reversible, production action, so both
    // surfaces that can trigger it require the same confirmation step.
    if (
      !window.confirm(
        `Activate the FREE testing plan for "${selectedClub.name}"? This bypasses paid membership for this club.`,
      )
    ) {
      return;
    }
    activateFreePlan.mutate(selectedClubId);
  }

  return (
    // flex-col by default (mobile) stacks the club-picker list above the
    // settings panel; md:flex-row restores this as a side-by-side
    // master-detail layout once there's enough width for it. Without this,
    // both columns always sat in a row — on mobile the list column's
    // max-w-xs/shrink-0 held it near its full desktop width, squeezing the
    // settings panel (min-w-0 flex-1) into an unusably narrow sliver next
    // to it instead of stacking.
    <div
      data-testid="admin-club-settings-root"
      className="flex h-full min-h-0 flex-col gap-4 md:flex-row"
    >
      <div
        data-testid="admin-club-settings-list-column"
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
        data-testid="admin-club-settings-detail-column"
        className="min-w-0 md:flex-1 md:basis-[70%]"
      >
        {selectedClubId ? (
          <div className="flex flex-col gap-4">
            {(owner || (selectedClub && selectedClub.plan !== "FREE")) && (
              <div className="flex justify-end gap-2">
                {selectedClub && selectedClub.plan !== "FREE" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={activateFreePlan.isPending}
                    onClick={handleActivateFreePlan}
                  >
                    <Gift size={14} strokeWidth={2.25} />
                    {activateFreePlan.isPending
                      ? "Activating…"
                      : "Activate free plan"}
                  </Button>
                )}
                {owner && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={impersonateOwner.isPending}
                    onClick={() =>
                      impersonateOwner.mutate({ userId: owner.id })
                    }
                  >
                    <UserRoundCog size={14} strokeWidth={2.25} />
                    {impersonateOwner.isPending
                      ? "Signing in…"
                      : "Impersonate owner"}
                  </Button>
                )}
              </div>
            )}
            <ClubSettingsView clubId={selectedClubId} />
          </div>
        ) : (
          <StatusBox>Select a club to view its settings.</StatusBox>
        )}
      </div>
    </div>
  );
}
