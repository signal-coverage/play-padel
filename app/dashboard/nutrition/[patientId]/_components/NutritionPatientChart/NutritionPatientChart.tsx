"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  createNutritionPlan,
  updateNutritionPlan,
  createNutritionSession,
  deleteNutritionSession,
} from "@/app/actions/nutrition";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import type {
  NutritionPatientChartProps,
  SessionFormState,
  PlanFormState,
} from "./types";
import type {
  NutritionPlanRecord,
  NutritionSessionRecord,
} from "@/app/actions/nutrition";
import type { NutritionPlanStatus } from "@/core/nutrition/types";
import { EMPTY_SESSION_FORM, EMPTY_PLAN_FORM } from "./consts";

const STATUS_LABELS: Record<NutritionPlanStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  SUSPENDED: "Suspended",
};

function PlanStatusBadge({ status }: { status: NutritionPlanStatus }) {
  if (status === "ACTIVE") {
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
  return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
}

export function NutritionPatientChart({
  patientId,
  initialPlans,
  initialSessions,
  onRefresh,
}: NutritionPatientChartProps) {
  const { hasPermission } = usePermission();
  const canDelete = hasPermission("nutrition.delete");

  const [plans, setPlans] = useState<NutritionPlanRecord[]>(initialPlans);
  const [sessions, setSessions] =
    useState<NutritionSessionRecord[]>(initialSessions);

  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );

  const [sessionForm, setSessionForm] =
    useState<SessionFormState>(EMPTY_SESSION_FORM);
  const [newPlanForm, setNewPlanForm] =
    useState<PlanFormState>(EMPTY_PLAN_FORM);
  const [editPlanForm, setEditPlanForm] =
    useState<PlanFormState>(EMPTY_PLAN_FORM);

  const [isSavingSession, startSavingSession] = useTransition();
  const [isSavingNewPlan, startSavingNewPlan] = useTransition();
  const [isSavingEditPlan, startSavingEditPlan] = useTransition();
  const [isUpdatingStatus, startUpdatingStatus] = useTransition();
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );

  const activePlan = plans.find((p) => p.status === "ACTIVE") ?? null;

  function handleStartEditPlan(plan: NutritionPlanRecord) {
    setEditingPlanId(plan.id);
    setEditPlanForm({
      title: plan.title,
      caloricTarget: plan.caloricTarget?.toString() ?? "",
      proteinTarget: plan.proteinTarget?.toString() ?? "",
      carbTarget: plan.carbTarget?.toString() ?? "",
      fatTarget: plan.fatTarget?.toString() ?? "",
      notes: plan.notes ?? "",
      startDate: plan.startDate
        ? new Date(plan.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
  }

  function handleSaveNewPlan() {
    if (!newPlanForm.title.trim()) {
      toast.error("Plan title is required");
      return;
    }
    startSavingNewPlan(async () => {
      const result = await createNutritionPlan(patientId, {
        title: newPlanForm.title.trim(),
        caloricTarget: newPlanForm.caloricTarget
          ? Number(newPlanForm.caloricTarget)
          : undefined,
        proteinTarget: newPlanForm.proteinTarget
          ? Number(newPlanForm.proteinTarget)
          : undefined,
        carbTarget: newPlanForm.carbTarget
          ? Number(newPlanForm.carbTarget)
          : undefined,
        fatTarget: newPlanForm.fatTarget
          ? Number(newPlanForm.fatTarget)
          : undefined,
        notes: newPlanForm.notes.trim() || undefined,
        startDate: new Date(newPlanForm.startDate),
      });
      if (result.success) {
        toast.success("Plan created");
        setPlans((prev) => [result.data, ...prev]);
        setNewPlanForm(EMPTY_PLAN_FORM);
        setShowNewPlanForm(false);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSaveEditPlan() {
    if (!editingPlanId) return;
    if (!editPlanForm.title.trim()) {
      toast.error("Plan title is required");
      return;
    }
    startSavingEditPlan(async () => {
      const result = await updateNutritionPlan(editingPlanId, {
        title: editPlanForm.title.trim(),
        caloricTarget: editPlanForm.caloricTarget
          ? Number(editPlanForm.caloricTarget)
          : null,
        proteinTarget: editPlanForm.proteinTarget
          ? Number(editPlanForm.proteinTarget)
          : null,
        carbTarget: editPlanForm.carbTarget
          ? Number(editPlanForm.carbTarget)
          : null,
        fatTarget: editPlanForm.fatTarget
          ? Number(editPlanForm.fatTarget)
          : null,
        notes: editPlanForm.notes.trim() || null,
      });
      if (result.success) {
        toast.success("Plan updated");
        setPlans((prev) =>
          prev.map((p) =>
            p.id === editingPlanId
              ? {
                  ...p,
                  title: editPlanForm.title.trim(),
                  caloricTarget: editPlanForm.caloricTarget
                    ? Number(editPlanForm.caloricTarget)
                    : null,
                  proteinTarget: editPlanForm.proteinTarget
                    ? Number(editPlanForm.proteinTarget)
                    : null,
                  carbTarget: editPlanForm.carbTarget
                    ? Number(editPlanForm.carbTarget)
                    : null,
                  fatTarget: editPlanForm.fatTarget
                    ? Number(editPlanForm.fatTarget)
                    : null,
                  notes: editPlanForm.notes.trim() || null,
                }
              : p,
          ),
        );
        setEditingPlanId(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleUpdatePlanStatus(id: string, status: NutritionPlanStatus) {
    startUpdatingStatus(async () => {
      const result = await updateNutritionPlan(id, { status });
      if (result.success) {
        setPlans((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p)),
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSaveSession() {
    startSavingSession(async () => {
      const result = await createNutritionSession(patientId, {
        planId: sessionForm.planId || undefined,
        weight: sessionForm.weight ? Number(sessionForm.weight) : undefined,
        bmi: sessionForm.bmi ? Number(sessionForm.bmi) : undefined,
        chiefComplaint: sessionForm.chiefComplaint.trim() || undefined,
        observations: sessionForm.observations.trim() || undefined,
        dietaryChanges: sessionForm.dietaryChanges.trim() || undefined,
      });
      if (result.success) {
        toast.success("Session saved");
        setSessions((prev) => [result.data, ...prev]);
        setSessionForm(EMPTY_SESSION_FORM);
        setShowSessionForm(false);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteSession(id: string) {
    setDeletingSessionId(id);
    void deleteNutritionSession(id).then((result) => {
      setDeletingSessionId(null);
      if (result.success) {
        toast.success("Session deleted");
        setSessions((prev) => prev.filter((s) => s.id !== id));
        onRefresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Active Plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Active Plan</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewPlanForm((v) => !v);
                setEditingPlanId(null);
              }}
            >
              {showNewPlanForm ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  New Plan
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New plan inline form */}
          {showNewPlanForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">New Nutrition Plan</p>
              <div className="flex flex-col gap-1">
                <Label htmlFor="np-title">Title *</Label>
                <Input
                  id="np-title"
                  placeholder="e.g. Weight loss plan"
                  value={newPlanForm.title}
                  onChange={(e) =>
                    setNewPlanForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="np-start">Start Date</Label>
                <Input
                  id="np-start"
                  type="date"
                  value={newPlanForm.startDate}
                  onChange={(e) =>
                    setNewPlanForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="np-calories">Caloric Target (kcal)</Label>
                <Input
                  id="np-calories"
                  type="number"
                  min={0}
                  placeholder="e.g. 2000"
                  value={newPlanForm.caloricTarget}
                  onChange={(e) =>
                    setNewPlanForm((f) => ({
                      ...f,
                      caloricTarget: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="np-protein">Protein Target (g)</Label>
                <Input
                  id="np-protein"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="e.g. 150"
                  value={newPlanForm.proteinTarget}
                  onChange={(e) =>
                    setNewPlanForm((f) => ({
                      ...f,
                      proteinTarget: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="np-carbs">Carb Target (g)</Label>
                <Input
                  id="np-carbs"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="e.g. 200"
                  value={newPlanForm.carbTarget}
                  onChange={(e) =>
                    setNewPlanForm((f) => ({
                      ...f,
                      carbTarget: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="np-fat">Fat Target (g)</Label>
                <Input
                  id="np-fat"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="e.g. 65"
                  value={newPlanForm.fatTarget}
                  onChange={(e) =>
                    setNewPlanForm((f) => ({ ...f, fatTarget: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="np-notes">Notes</Label>
                <Textarea
                  id="np-notes"
                  placeholder="Additional notes..."
                  value={newPlanForm.notes}
                  onChange={(e) =>
                    setNewPlanForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveNewPlan}
                disabled={isSavingNewPlan}
              >
                {isSavingNewPlan ? "Saving..." : "Create Plan"}
              </Button>
            </div>
          )}

          {/* Active plan display / edit */}
          {activePlan ? (
            editingPlanId === activePlan.id ? (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <p className="text-sm font-medium">Edit Plan</p>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-title">Title *</Label>
                  <Input
                    id="ep-title"
                    value={editPlanForm.title}
                    onChange={(e) =>
                      setEditPlanForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-calories">Caloric Target (kcal)</Label>
                  <Input
                    id="ep-calories"
                    type="number"
                    min={0}
                    value={editPlanForm.caloricTarget}
                    onChange={(e) =>
                      setEditPlanForm((f) => ({
                        ...f,
                        caloricTarget: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-protein">Protein Target (g)</Label>
                  <Input
                    id="ep-protein"
                    type="number"
                    min={0}
                    step="0.1"
                    value={editPlanForm.proteinTarget}
                    onChange={(e) =>
                      setEditPlanForm((f) => ({
                        ...f,
                        proteinTarget: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-carbs">Carb Target (g)</Label>
                  <Input
                    id="ep-carbs"
                    type="number"
                    min={0}
                    step="0.1"
                    value={editPlanForm.carbTarget}
                    onChange={(e) =>
                      setEditPlanForm((f) => ({
                        ...f,
                        carbTarget: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-fat">Fat Target (g)</Label>
                  <Input
                    id="ep-fat"
                    type="number"
                    min={0}
                    step="0.1"
                    value={editPlanForm.fatTarget}
                    onChange={(e) =>
                      setEditPlanForm((f) => ({
                        ...f,
                        fatTarget: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="ep-notes">Notes</Label>
                  <Textarea
                    id="ep-notes"
                    value={editPlanForm.notes}
                    onChange={(e) =>
                      setEditPlanForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEditPlan}
                    disabled={isSavingEditPlan}
                  >
                    {isSavingEditPlan ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingPlanId(null)}
                    disabled={isSavingEditPlan}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{activePlan.title}</p>
                      <PlanStatusBadge status={activePlan.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Started{" "}
                      {new Date(activePlan.startDate).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </p>
                    {(activePlan.caloricTarget != null ||
                      activePlan.proteinTarget != null ||
                      activePlan.carbTarget != null ||
                      activePlan.fatTarget != null) && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {activePlan.caloricTarget != null && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Calories:{" "}
                            </span>
                            <span className="font-medium">
                              {activePlan.caloricTarget} kcal
                            </span>
                          </div>
                        )}
                        {activePlan.proteinTarget != null && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Protein:{" "}
                            </span>
                            <span className="font-medium">
                              {activePlan.proteinTarget}g
                            </span>
                          </div>
                        )}
                        {activePlan.carbTarget != null && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              Carbs:{" "}
                            </span>
                            <span className="font-medium">
                              {activePlan.carbTarget}g
                            </span>
                          </div>
                        )}
                        {activePlan.fatTarget != null && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Fat: </span>
                            <span className="font-medium">
                              {activePlan.fatTarget}g
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {activePlan.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {activePlan.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEditPlan(activePlan)}
                    >
                      Edit Plan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdatingStatus}
                      onClick={() =>
                        handleUpdatePlanStatus(activePlan.id, "COMPLETED")
                      }
                    >
                      Mark Completed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdatingStatus}
                      onClick={() =>
                        handleUpdatePlanStatus(activePlan.id, "SUSPENDED")
                      }
                    >
                      Suspend
                    </Button>
                  </div>
                </div>
              </div>
            )
          ) : !showNewPlanForm ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active nutrition plan. Create one to get started.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* New Session Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Today&apos;s Session</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSessionForm((v) => !v)}
          >
            {showSessionForm ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                New Session
              </>
            )}
          </Button>
        </CardHeader>
        {showSessionForm && (
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-weight">Weight (kg)</Label>
              <Input
                id="s-weight"
                type="number"
                min={0}
                step="0.1"
                placeholder="e.g. 72.5"
                value={sessionForm.weight}
                onChange={(e) =>
                  setSessionForm((f) => ({ ...f, weight: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-bmi">BMI</Label>
              <Input
                id="s-bmi"
                type="number"
                min={0}
                step="0.1"
                placeholder="e.g. 24.5"
                value={sessionForm.bmi}
                onChange={(e) =>
                  setSessionForm((f) => ({ ...f, bmi: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-complaint">Chief Complaint</Label>
              <Textarea
                id="s-complaint"
                placeholder="Patient's main concern..."
                value={sessionForm.chiefComplaint}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    chiefComplaint: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-observations">Observations</Label>
              <Textarea
                id="s-observations"
                placeholder="Clinical observations..."
                value={sessionForm.observations}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    observations: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-dietary">Dietary Changes</Label>
              <Textarea
                id="s-dietary"
                placeholder="Recommended dietary changes..."
                value={sessionForm.dietaryChanges}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    dietaryChanges: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <Button onClick={handleSaveSession} disabled={isSavingSession}>
              {isSavingSession ? "Saving..." : "Save Session"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-8 text-center">
              No sessions recorded yet.
            </p>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;
                return (
                  <div key={session.id}>
                    <div
                      className="px-6 py-4 flex items-start gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() =>
                        setExpandedSessionId(isExpanded ? null : session.id)
                      }
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium">
                          {new Date(session.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {session.weight != null && (
                            <p className="text-xs text-muted-foreground">
                              Weight: {session.weight} kg
                            </p>
                          )}
                          {session.bmi != null && (
                            <p className="text-xs text-muted-foreground">
                              BMI: {session.bmi}
                            </p>
                          )}
                          {session.chiefComplaint && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {session.chiefComplaint}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={deletingSessionId === session.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-6 pb-4 space-y-2 bg-muted/10">
                        {session.observations && (
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Observations
                            </span>
                            <p className="text-sm mt-0.5">
                              {session.observations}
                            </p>
                          </div>
                        )}
                        {session.dietaryChanges && (
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Dietary Changes
                            </span>
                            <p className="text-sm mt-0.5">
                              {session.dietaryChanges}
                            </p>
                          </div>
                        )}
                        {!session.observations && !session.dietaryChanges && (
                          <p className="text-xs text-muted-foreground">
                            No additional details recorded.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Plans */}
      {plans.filter((p) => p.status !== "ACTIVE").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {plans
                .filter((p) => p.status !== "ACTIVE")
                .map((plan) => (
                  <div key={plan.id} className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{plan.title}</p>
                      <PlanStatusBadge status={plan.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Started{" "}
                      {new Date(plan.startDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {plan.notes && (
                      <p className="text-sm text-muted-foreground">
                        {plan.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
