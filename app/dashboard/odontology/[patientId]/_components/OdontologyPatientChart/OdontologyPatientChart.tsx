"use client";

import "odonto-next/style.css";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import {
  OdontogramEditor,
  serializeState,
  deserializeState,
  type OdontogramState,
} from "odonto-next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, X } from "lucide-react";
import {
  saveOdontogramState,
  saveConsultation,
  createTreatment,
  updateTreatment,
  deleteTreatment,
} from "@/app/actions/odontology";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import type {
  OdontologyPatientChartProps,
  VisitFormState,
  TreatmentFormState,
} from "./types";
import type { TreatmentRecord } from "@/app/actions/odontology";
import type { TreatmentStatus } from "@/core/odontology/types";
import {
  ERPFLOW_THEME,
  EMPTY_VISIT_FORM,
  EMPTY_TREATMENT_FORM,
  TREATMENT_STATUS_OPTIONS,
} from "./consts";

const STATUS_LABELS: Record<TreatmentStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function TreatmentStatusBadge({ status }: { status: TreatmentStatus }) {
  if (status === "PLANNED") {
    return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
  }
  if (status === "IN_PROGRESS") {
    return <Badge variant="default">{STATUS_LABELS[status]}</Badge>;
  }
  if (status === "COMPLETED") {
    return (
      <Badge
        variant="outline"
        className="border-green-500 text-green-600 dark:text-green-400"
      >
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="line-through">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function OdontologyPatientChart({
  patientId,
  initialOdontogramState,
  consultations: initialConsultations,
  treatments: initialTreatments,
  nextAppointment,
}: OdontologyPatientChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { hasPermission } = usePermission();
  const canDelete = hasPermission("odontology.delete");

  const [odontogramState, setOdontogramState] = useState<OdontogramState>(() =>
    initialOdontogramState ? deserializeState(initialOdontogramState) : {},
  );
  const [consultations, setConsultations] = useState(initialConsultations);
  const [treatments, setTreatments] =
    useState<TreatmentRecord[]>(initialTreatments);
  const [visitForm, setVisitForm] = useState<VisitFormState>(EMPTY_VISIT_FORM);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [treatmentForm, setTreatmentForm] =
    useState<TreatmentFormState>(EMPTY_TREATMENT_FORM);

  const [isSavingOdontogram, startSavingOdontogram] = useTransition();
  const [isSavingVisit, startSavingVisit] = useTransition();
  const [isSavingTreatment, startSavingTreatment] = useTransition();
  const [deletingTreatmentId, setDeletingTreatmentId] = useState<string | null>(
    null,
  );
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  function handleSaveOdontogram() {
    startSavingOdontogram(async () => {
      const serialized = serializeState(odontogramState);
      const result = await saveOdontogramState(patientId, serialized);
      if (result.success) {
        toast.success("Odontogram saved");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSaveVisit() {
    startSavingVisit(async () => {
      const serialized = serializeState(odontogramState);
      const result = await saveConsultation(patientId, {
        ...visitForm,
        odontogramState: serialized,
      });
      if (result.success) {
        toast.success("Visit saved");
        setConsultations((prev) => [result.data, ...prev]);
        setVisitForm(EMPTY_VISIT_FORM);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAddTreatment() {
    if (!treatmentForm.description.trim()) {
      toast.error("Description is required");
      return;
    }
    startSavingTreatment(async () => {
      const result = await createTreatment(patientId, {
        description: treatmentForm.description.trim(),
        toothNumber: treatmentForm.toothNumber
          ? Number(treatmentForm.toothNumber)
          : undefined,
        surface: treatmentForm.surface.trim() || undefined,
        price: treatmentForm.price ? Number(treatmentForm.price) : undefined,
        notes: treatmentForm.notes.trim() || undefined,
      });
      if (result.success) {
        toast.success("Treatment added");
        setTreatments((prev) => [result.data, ...prev]);
        setTreatmentForm(EMPTY_TREATMENT_FORM);
        setShowAddTreatment(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleUpdateStatus(id: string, status: TreatmentStatus) {
    setUpdatingStatusId(id);
    void updateTreatment(id, { status }).then((result) => {
      setUpdatingStatusId(null);
      if (result.success) {
        setTreatments((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status } : t)),
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteTreatment(id: string) {
    setDeletingTreatmentId(id);
    void deleteTreatment(id).then((result) => {
      setDeletingTreatmentId(null);
      if (result.success) {
        toast.success("Treatment removed");
        setTreatments((prev) => prev.filter((t) => t.id !== id));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Dental Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Dental Chart</CardTitle>
          <Button
            size="sm"
            onClick={handleSaveOdontogram}
            disabled={isSavingOdontogram}
          >
            {isSavingOdontogram ? "Saving..." : "Save Chart"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <OdontogramEditor
            state={odontogramState}
            onChange={setOdontogramState}
            darkMode={isDark}
            themeConfig={ERPFLOW_THEME}
            language="en"
            enableNotes
          />
        </CardContent>
      </Card>

      {/* Today's Visit */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Visit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="chiefComplaint">Chief Complaint</Label>
            <Textarea
              id="chiefComplaint"
              placeholder="Patient's main concern..."
              value={visitForm.chiefComplaint}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, chiefComplaint: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              placeholder="Clinical findings and diagnosis..."
              value={visitForm.diagnosis}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, diagnosis: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="treatment">Treatment</Label>
            <Textarea
              id="treatment"
              placeholder="Procedures performed..."
              value={visitForm.treatment}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, treatment: e.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={visitForm.notes}
              onChange={(e) =>
                setVisitForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
            />
          </div>
          <Button onClick={handleSaveVisit} disabled={isSavingVisit}>
            {isSavingVisit ? "Saving..." : "Save Visit"}
          </Button>
        </CardContent>
      </Card>

      {/* Treatment Plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Treatment Plan</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddTreatment((v) => !v)}
          >
            {showAddTreatment ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Treatment
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add treatment inline form */}
          {showAddTreatment && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex flex-col gap-1">
                <Label htmlFor="t-description">Description *</Label>
                <Input
                  id="t-description"
                  placeholder="Describe the treatment..."
                  value={treatmentForm.description}
                  onChange={(e) =>
                    setTreatmentForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="t-tooth">Tooth Number (1–32)</Label>
                <Input
                  id="t-tooth"
                  type="number"
                  min={1}
                  max={32}
                  placeholder="e.g. 16"
                  value={treatmentForm.toothNumber}
                  onChange={(e) =>
                    setTreatmentForm((f) => ({
                      ...f,
                      toothNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="t-surface">Surface</Label>
                <Input
                  id="t-surface"
                  placeholder="e.g. mesial, occlusal..."
                  value={treatmentForm.surface}
                  onChange={(e) =>
                    setTreatmentForm((f) => ({
                      ...f,
                      surface: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="t-price">Price</Label>
                <Input
                  id="t-price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={treatmentForm.price}
                  onChange={(e) =>
                    setTreatmentForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="t-notes">Notes</Label>
                <Textarea
                  id="t-notes"
                  placeholder="Additional notes..."
                  value={treatmentForm.notes}
                  onChange={(e) =>
                    setTreatmentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddTreatment}
                disabled={isSavingTreatment}
              >
                {isSavingTreatment ? "Saving..." : "Save Treatment"}
              </Button>
            </div>
          )}

          {/* Treatment list */}
          {treatments.length === 0 && !showAddTreatment ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No treatments planned yet.
            </p>
          ) : (
            <div className="divide-y">
              {treatments.map((t) => (
                <div key={t.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.toothNumber != null && (
                        <span className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">
                          #{t.toothNumber}
                        </span>
                      )}
                      {t.surface && (
                        <span className="text-xs text-muted-foreground">
                          {t.surface}
                        </span>
                      )}
                      <span
                        className={
                          t.status === "CANCELLED"
                            ? "text-sm font-medium line-through text-muted-foreground"
                            : "text-sm font-medium"
                        }
                      >
                        {t.description}
                      </span>
                    </div>
                    {t.price != null && (
                      <p className="text-xs text-muted-foreground">
                        ${t.price.toFixed(2)}
                      </p>
                    )}
                    {t.notes && (
                      <p className="text-xs text-muted-foreground">{t.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={t.status}
                      onValueChange={(v) =>
                        handleUpdateStatus(t.id, v as TreatmentStatus)
                      }
                      disabled={updatingStatusId === t.id}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue>
                          <TreatmentStatusBadge status={t.status} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TREATMENT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deletingTreatmentId === t.id}
                        onClick={() => handleDeleteTreatment(t.id)}
                        aria-label="Delete treatment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-8 text-center">
              No previous visits recorded.
            </p>
          ) : (
            <div className="divide-y">
              {consultations.map((c) => (
                <div key={c.id} className="px-6 py-4 space-y-2">
                  <span className="text-sm font-medium">
                    {new Date(c.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  {c.chiefComplaint && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Chief Complaint
                      </span>
                      <p className="text-sm mt-0.5">{c.chiefComplaint}</p>
                    </div>
                  )}
                  {c.diagnosis && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Diagnosis
                      </span>
                      <p className="text-sm mt-0.5">{c.diagnosis}</p>
                    </div>
                  )}
                  {c.treatment && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Treatment
                      </span>
                      <p className="text-sm mt-0.5">{c.treatment}</p>
                    </div>
                  )}
                  {c.notes && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Notes
                      </span>
                      <p className="text-sm mt-0.5">{c.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Appointment */}
      {nextAppointment && (
        <Card>
          <CardHeader>
            <CardTitle>Next Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium">
                  {new Date(nextAppointment.scheduledStart).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextAppointment.scheduledStart).toLocaleTimeString(
                    "en-US",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                  {" – "}
                  {new Date(nextAppointment.scheduledEnd).toLocaleTimeString(
                    "en-US",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                  {nextAppointment.professionalName
                    ? ` · ${nextAppointment.professionalName}`
                    : ""}
                </p>
                {nextAppointment.reason && (
                  <p className="text-sm text-muted-foreground">
                    {nextAppointment.reason}
                  </p>
                )}
              </div>
              <Badge variant="outline">{nextAppointment.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
