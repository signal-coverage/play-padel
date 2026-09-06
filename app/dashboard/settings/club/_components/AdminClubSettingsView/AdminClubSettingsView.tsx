"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBox } from "@/components/StatusBox";
import { ClubSettingsView } from "../ClubSettingsView";
import { AdminClubList } from "./components/AdminClubList";
import { useAdminClubs, useClubOwner, useImpersonateOwner } from "./hooks";

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

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="w-full max-w-xs shrink-0 md:basis-[30%]">
        <AdminClubList
          clubs={clubs}
          isLoading={isLoading}
          selectedClubId={selectedClubId}
          onSelectClub={setSelectedClubId}
        />
      </div>

      <div className="min-w-0 flex-1 md:basis-[70%]">
        {selectedClubId ? (
          <div className="flex flex-col gap-4">
            {owner && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={impersonateOwner.isPending}
                  onClick={() => impersonateOwner.mutate({ userId: owner.id })}
                >
                  <UserRoundCog size={14} strokeWidth={2.25} />
                  {impersonateOwner.isPending
                    ? "Signing in…"
                    : "Impersonate owner"}
                </Button>
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
