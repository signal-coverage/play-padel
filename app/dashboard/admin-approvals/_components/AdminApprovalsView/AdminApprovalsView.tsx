"use client";

import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Button } from "@/components/ui/button";
import { usePendingClubs, useApproveClub, useRejectClub } from "./hooks";
import { RejectConfirmDialog } from "./components/RejectConfirmDialog";
import type { DataTableColumn } from "@/components/DataTable";
import type { PendingClub } from "./types";

/**
 * Admin-only club approval queue (see prisma/schema.prisma's
 * Club.approvalStatus and lib/mercadopago/operationalStatus.ts's
 * PENDING_APPROVAL cause): a new club from onboarding cannot operate — accept
 * real reservations — until an admin approves it here. Approve is a direct
 * action (non-destructive, reversible via a later reject); reject goes
 * through RejectConfirmDialog since it's the consequential direction — same
 * "confirm only the consequential action" convention as
 * ClubInactiveCard/CourtsView elsewhere in this codebase.
 */
export function AdminApprovalsView() {
  const { data: clubs, isLoading } = usePendingClubs();
  const approve = useApproveClub();
  const reject = useRejectClub();
  const [rejectTarget, setRejectTarget] = useState<PendingClub | null>(null);

  const columns: DataTableColumn<PendingClub>[] = [
    {
      key: "club",
      header: "Club",
      cell: (club) => (
        <div className="flex flex-col gap-1 py-0.5">
          <span className="font-medium">{club.name}</span>
          <span className="text-muted-foreground">{club.email}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (club) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onClick={() => approve.mutate(club.id)}
            disabled={approve.isPending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setRejectTarget(club)}
            disabled={reject.isPending}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  async function handleConfirmReject() {
    if (!rejectTarget) return;
    try {
      await reject.mutateAsync(rejectTarget.id);
      setRejectTarget(null);
    } catch {
      // Surfaced below via reject.error inside the dialog's own description
      // slot would require plumbing it through — kept simple for now: the
      // dialog just stays open so the admin can retry.
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Approvals
        </h1>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Clubs from onboarding wait here until an admin approves them — until
          then they can&apos;t accept real reservations.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={clubs ?? []}
        rowKey={(club) => club.id}
        isLoading={isLoading}
        loadingLabel="Loading pending clubs…"
        emptyState={<StatusBox>No clubs are waiting for approval.</StatusBox>}
      />

      <RejectConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        target={rejectTarget}
        isSubmitting={reject.isPending}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
