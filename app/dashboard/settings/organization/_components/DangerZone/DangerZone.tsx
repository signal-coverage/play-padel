"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { AlertTriangle, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  disableOrganization,
  enableOrganization,
  deleteOrganization,
} from "@/app/actions/organizations";
import type { Organization } from "@/core/organizations/types";

interface DangerZoneProps {
  organization: Organization;
}

export function DangerZone({ organization }: DangerZoneProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);

  const isDisabled = organization.status === "DISABLED";

  async function handleDisable() {
    setLoading(true);
    const result = await disableOrganization();
    setLoading(false);
    setDisableDialogOpen(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to disable organization.");
      return;
    }
    toast.success("Organization disabled. You will be signed out.");
    await signOut();
    router.push("/");
  }

  async function handleEnable() {
    setLoading(true);
    const result = await enableOrganization();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to enable organization.");
      return;
    }
    toast.success("Organization re-enabled.");
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    const result = await deleteOrganization();
    setLoading(false);
    setDeleteDialogOpen(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete organization.");
      return;
    }
    toast.success("Organization permanently deleted.");
    await signOut();
    router.push("/");
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h2 className="text-base font-semibold text-destructive">
          Danger Zone
        </h2>
      </div>

      <div className="border border-destructive/40 rounded-xl divide-y divide-destructive/20">
        {/* Disable / Enable */}
        <div className="p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {isDisabled ? "Re-enable organization" : "Disable organization"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isDisabled
                ? "Restore access for all users in this organization."
                : "Suspend access without deleting any data. You can re-enable it at any time."}
            </p>
          </div>
          {isDisabled ? (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-green-700 border-green-300 hover:bg-green-50"
              onClick={handleEnable}
              disabled={loading}
            >
              <Power className="w-4 h-4 mr-1.5" />
              Re-enable
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-destructive border-destructive/40 hover:bg-destructive/5"
              onClick={() => setDisableDialogOpen(true)}
              disabled={loading}
            >
              <PowerOff className="w-4 h-4 mr-1.5" />
              Disable
            </Button>
          )}
        </div>

        {/* Delete */}
        <div className="p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete organization</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Permanently removes the organization and all its data. This cannot
              be undone.
              {!isDisabled && (
                <span className="block mt-1 text-amber-600 font-medium">
                  Not sure? Consider disabling instead — your data stays safe.
                </span>
              )}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setConfirmName("");
              setDeleteDialogOpen(true);
            }}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Disable confirmation */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable organization?</AlertDialogTitle>
            <AlertDialogDescription>
              All users will lose access immediately. No data will be deleted —
              you can re-enable the organization at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? "Disabling…" : "Disable organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete organization?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will delete{" "}
                  <span className="font-semibold text-foreground">
                    {organization.name}
                  </span>{" "}
                  and all of its data — patients, appointments, invoices,
                  professionals, and more. There is no undo.
                </p>
                {!isDisabled && (
                  <p className="text-amber-600 text-sm font-medium">
                    If you&apos;re not sure, disable the organization instead.
                    You can re-enable it later with all data intact.
                  </p>
                )}
                <div className="pt-1">
                  <p className="text-sm mb-1.5">
                    Type{" "}
                    <span className="font-semibold text-foreground">
                      {organization.name}
                    </span>{" "}
                    to confirm:
                  </p>
                  <Input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={organization.name}
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || confirmName !== organization.name}
              className="bg-destructive hover:bg-destructive/90 disabled:opacity-50"
            >
              {loading ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
