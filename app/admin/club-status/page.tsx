"use client";

// Real admin tool, now gated by app/admin/layout.tsx's Clerk-based admin
// check (see lib/auth/admin.ts) instead of a hand-typed static secret. Every
// mutating call this page makes rides the caller's own same-origin Clerk
// session cookie automatically — this page has no auth state of its own to
// manage.

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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

// Iteration order for the status dropdown — each value's translated label is
// resolved against messages/*.json's "ClubStatusAdminPage.statusOptions"
// namespace inside the component (see STATUS_VALUES below).
const STATUS_VALUES: ClubStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "DISABLED",
];

// Mirrors the body?.error ?? fallback extraction convention already used by
// CourtsView/hooks.ts's fetchJson helper, kept as a small standalone helper
// (rather than that exact generic fetchJson) per this repo's SRP-per-folder
// convention. `fallback` is the caller's own translated generic-error
// string, since this plain helper can't call useTranslations() itself (see
// AuditLogsView/utils.ts's getActionLabel for the same pattern).
async function extractErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? fallback;
}

export default function ClubStatusAdminPage() {
  const t = useTranslations("ClubStatusAdminPage");
  const genericError = t("genericError");
  const [clubId, setClubId] = useState("");
  const [club, setClub] = useState<Club | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ClubStatus | "">("");
  const [updatedByInput, setUpdatedByInput] = useState("");

  const [lookupPending, setLookupPending] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [activateFreePlanPending, setActivateFreePlanPending] = useState(false);

  const statusLabels: Record<ClubStatus, string> = {
    ACTIVE: t("statusOptions.active"),
    INACTIVE: t("statusOptions.inactive"),
    SUSPENDED: t("statusOptions.suspended"),
    DISABLED: t("statusOptions.disabled"),
  };

  async function handleLookup() {
    setLookupPending(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/admin/club-status?clubId=${encodeURIComponent(clubId)}`,
      );
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, genericError));
      }
      const data: { club: Club } = await res.json();
      setClub(data.club);
      setSelectedStatus(data.club.status);
    } catch (err) {
      setClub(null);
      setLookupError(err instanceof Error ? err.message : genericError);
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
        throw new Error(await extractErrorMessage(res, genericError));
      }
      const data: { club: Club } = await res.json();
      setClub(data.club);
      setSelectedStatus(data.club.status);
      toast.success(t("clubStatusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : genericError);
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
      !window.confirm(t("activateFreePlanConfirm", { clubName: club.name }))
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
        throw new Error(await extractErrorMessage(res, genericError));
      }
      toast.success(t("freePlanActivated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : genericError);
    } finally {
      setActivateFreePlanPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="club-id">{t("clubIdLabel")}</Label>
            <Input
              id="club-id"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
            />
          </div>

          <div>
            <Button onClick={handleLookup} disabled={lookupPending || !clubId}>
              {lookupPending ? t("lookingUp") : t("lookUp")}
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
              {t("currentStatus", { status: statusLabels[club.status] })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("lastUpdatedBy", {
                updatedBy: club.updatedBy ?? "—",
                updatedAt: club.updatedAt,
              })}
            </p>

            <div className="flex flex-col gap-1">
              <Label htmlFor="new-status">{t("newStatusLabel")}</Label>
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
                  {STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="updated-by">{t("updatedByLabel")}</Label>
              <Input
                id="updated-by"
                value={updatedByInput}
                onChange={(e) => setUpdatedByInput(e.target.value)}
                placeholder={t("updatedByPlaceholder")}
              />
            </div>

            <div>
              <Button
                onClick={handleSave}
                disabled={savePending || !updatedByInput.trim()}
              >
                {savePending ? t("saving") : t("save")}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={handleActivateFreePlan}
                disabled={activateFreePlanPending}
              >
                {activateFreePlanPending
                  ? t("activatingFreePlan")
                  : t("activateFreePlan")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
