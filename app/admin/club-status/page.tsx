"use client";

// Real admin tool, now gated by app/admin/layout.tsx's Clerk-based admin
// check (see lib/auth/admin.ts) instead of a hand-typed static secret. Every
// mutating call this page makes rides the caller's own same-origin Clerk
// session cookie automatically — this page has no auth state of its own to
// manage.

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClubStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DISABLED";

type Club = {
  id: string;
  name: string;
  status: ClubStatus;
  updatedBy: string | null;
  updatedAt: string;
};

const STATUS_OPTIONS: { value: ClubStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DISABLED", label: "Disabled" },
];

const GENERIC_ERROR = "Something went wrong. Please try again.";

// Mirrors the body?.error ?? fallback extraction convention already used by
// CourtsView/hooks.ts's fetchJson helper, kept as a small standalone helper
// (rather than that exact generic fetchJson) per this repo's SRP-per-folder
// convention.
async function extractErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? GENERIC_ERROR;
}

export default function ClubStatusAdminPage() {
  const [clubId, setClubId] = useState("");
  const [club, setClub] = useState<Club | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ClubStatus | "">("");
  const [updatedByInput, setUpdatedByInput] = useState("");

  const [lookupPending, setLookupPending] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [activateFreePlanPending, setActivateFreePlanPending] = useState(false);

  async function handleLookup() {
    setLookupPending(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/admin/club-status?clubId=${encodeURIComponent(clubId)}`,
      );
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res));
      }
      const data: { club: Club } = await res.json();
      setClub(data.club);
      setSelectedStatus(data.club.status);
    } catch (err) {
      setClub(null);
      setLookupError(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setLookupPending(false);
    }
  }

  async function handleSave() {
    if (!club || !selectedStatus || !updatedByInput.trim()) return;
    setSavePending(true);
    try {
      const res = await fetch("/api/admin/club-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: club.id,
          status: selectedStatus,
          updatedBy: updatedByInput,
        }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res));
      }
      const data: { club: Club } = await res.json();
      setClub(data.club);
      setSelectedStatus(data.club.status);
      toast.success("Club status updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setSavePending(false);
    }
  }

  // Activates the hidden, admin-only "FREE" plan tier so this club's
  // dashboard is unblocked for internal testing (e.g. exercising the
  // player-side reservation payment flow) without a real Mercado Pago
  // subscription. This is a real, if reversible, production action — see
  // core/billing/services/membership.service.ts's activateFreePlan — so it
  // requires an explicit confirmation before sending. If the club already
  // has a real Mercado Pago subscription, the route refuses with 409 and
  // this simply surfaces that message via the same error-toast path; a
  // "retry with force" affordance is deliberately left out here rather than
  // ever retrying with force on its own initiative.
  async function handleActivateFreePlan() {
    if (!club) return;
    if (
      !window.confirm(
        `Activate the FREE testing plan for "${club.name}"? This bypasses paid membership for this club.`,
      )
    ) {
      return;
    }
    setActivateFreePlanPending(true);
    try {
      const res = await fetch("/api/admin/membership-free-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: club.id }),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res));
      }
      toast.success("Free plan activated for testing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setActivateFreePlanPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Club status admin</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="club-id">Club ID</Label>
            <Input
              id="club-id"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
            />
          </div>

          <div>
            <Button onClick={handleLookup} disabled={lookupPending || !clubId}>
              {lookupPending ? "Looking up…" : "Look up"}
            </Button>
          </div>

          {lookupError && (
            <p className="text-sm text-destructive">{lookupError}</p>
          )}
        </CardContent>
      </Card>

      {club && (
        <Card>
          <CardHeader>
            <CardTitle>{club.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Current status: {club.status}
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated by {club.updatedBy ?? "—"} at {club.updatedAt}
            </p>

            <div className="flex flex-col gap-1">
              <Label htmlFor="new-status">New status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as ClubStatus)
                }
              >
                <SelectTrigger id="new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="updated-by">Updated by</Label>
              <Input
                id="updated-by"
                value={updatedByInput}
                onChange={(e) => setUpdatedByInput(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <Button
                onClick={handleSave}
                disabled={savePending || !updatedByInput.trim()}
              >
                {savePending ? "Saving…" : "Save"}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={handleActivateFreePlan}
                disabled={activateFreePlanPending}
              >
                {activateFreePlanPending
                  ? "Activating…"
                  : "Activate free membership (testing)"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
