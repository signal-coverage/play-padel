"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getPatients, deletePatient } from "@/app/actions/patients";
import { PatientFilters } from "@/app/dashboard/patients/_components/PatientFilters";
import { PatientTable } from "@/app/dashboard/patients/_components/PatientTable";
import { PatientSheet } from "@/app/dashboard/patients/_components/PatientSheet";
import type {
  Patient,
  PatientFilters as PatientFiltersType,
} from "@/core/patients/types";

export function PatientsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("patients.create");
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<PatientFiltersType>({
    status: "ACTIVE",
    page: 1,
    pageSize: 20,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(
    undefined,
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["patients", filters],
    queryFn: () => getPatients(filters),
    placeholderData: (prev) => prev,
  });

  const patients = data?.success ? data.data.data : [];
  const total = data?.success ? data.data.total : 0;

  function handleFiltersChange(newFilters: PatientFiltersType) {
    setFilters(newFilters);
  }

  function handleNewPatient() {
    setEditingPatient(undefined);
    setSheetOpen(true);
  }

  function handleEdit(id: string) {
    const patient = patients.find((p) => p.id === id);
    setEditingPatient(patient);
    setSheetOpen(true);
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id);
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);

    try {
      const result = await deletePatient(id);
      if (result.success) {
        toast.success("Patient archived");
        queryClient.invalidateQueries({ queryKey: ["patients"] });
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to archive patient");
    }
  }

  function handleSheetSuccess() {
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? "patient" : "patients"} total
          </p>
        </div>
        {canCreate && <Button onClick={handleNewPatient}>New patient</Button>}
      </div>

      <PatientFilters filters={filters} onFiltersChange={handleFiltersChange} />

      <PatientTable
        patients={patients}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isFetching}
      />

      <PatientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        patient={editingPatient}
        onSuccess={handleSheetSuccess}
      />

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will archive the patient. You can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
