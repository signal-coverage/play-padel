"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { usePermission } from "@/core/permissions/hooks/use-permission";
import {
  getProfessionals,
  deactivateProfessional,
} from "@/app/actions/professionals";
import { ProfessionalTable } from "@/app/dashboard/professionals/_components/ProfessionalTable";
import { ProfessionalSheet } from "@/app/dashboard/professionals/_components/ProfessionalSheet";
import type { Professional } from "@/core/professionals/types";

export function ProfessionalsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("professionals.create");

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<
    Professional | undefined
  >(undefined);
  const [deactivateTargetId, setDeactivateTargetId] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getProfessionals({ active: true }).catch(() => null);
      if (cancelled) return;
      if (!result) {
        toast.error("Failed to load professionals");
        setLoading(false);
        return;
      }
      if (result.success) {
        setProfessionals(result.data.data);
        setTotal(result.data.total);
      } else {
        toast.error(result.error);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleNew() {
    setEditingProfessional(undefined);
    setSheetOpen(true);
  }

  function handleEdit(id: string) {
    const professional = professionals.find((p) => p.id === id);
    setEditingProfessional(professional);
    setSheetOpen(true);
  }

  function handleDeactivate(id: string) {
    setDeactivateTargetId(id);
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTargetId) return;
    const id = deactivateTargetId;
    setDeactivateTargetId(null);
    try {
      const result = await deactivateProfessional(id);
      if (result.success) {
        toast.success("Professional deactivated");
        setRefreshKey((k) => k + 1);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to deactivate professional");
    }
  }

  function handleSheetSuccess() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Professionals
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? "professional" : "professionals"} total
          </p>
        </div>
        {canCreate && <Button onClick={handleNew}>New professional</Button>}
      </div>

      <ProfessionalTable
        professionals={professionals}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        isLoading={loading}
      />

      <ProfessionalSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        professional={editingProfessional}
        onSuccess={handleSheetSuccess}
      />

      <AlertDialog
        open={deactivateTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Professional?</AlertDialogTitle>
            <AlertDialogDescription>
              This professional will be deactivated and will no longer appear in
              active lists. This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeactivate}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
