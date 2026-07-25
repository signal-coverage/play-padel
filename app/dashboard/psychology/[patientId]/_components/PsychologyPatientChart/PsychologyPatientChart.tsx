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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPsychologySession,
  deletePsychologySession,
  createPsychologyGoal,
  updatePsychologyGoal,
  deletePsychologyGoal,
} from "@/app/actions/psychology";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import type {
  PsychologyPatientChartProps,
  SessionFormState,
  GoalFormState,
} from "./types";
import type {
  PsychologySessionRecord,
  PsychologyGoalRecord,
} from "@/app/actions/psychology";
import type { RiskLevel, GoalStatus } from "@/core/psychology/types";
import {
  EMPTY_SESSION_FORM,
  EMPTY_GOAL_FORM,
  SESSION_TYPE_OPTIONS,
  RISK_LEVEL_OPTIONS,
  GOAL_STATUS_OPTIONS,
} from "./consts";

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  LOW: "border-gray-400 text-gray-600 dark:text-gray-400",
  MEDIUM: "border-yellow-500 text-yellow-600 dark:text-yellow-400",
  HIGH: "border-orange-500 text-orange-600 dark:text-orange-400",
  CRITICAL: "border-red-500 text-red-600 dark:text-red-400",
};

const GOAL_STATUS_BADGE_CLASSES: Record<GoalStatus, string> = {
  ACTIVE: "border-blue-500 text-blue-600 dark:text-blue-400",
  ACHIEVED: "border-green-500 text-green-600 dark:text-green-400",
  ABANDONED: "border-gray-400 text-gray-500 dark:text-gray-400",
};

function RiskBadge({ risk }: { risk: RiskLevel | null | undefined }) {
  if (!risk) return null;
  return (
    <Badge variant="outline" className={RISK_BADGE_CLASSES[risk]}>
      {risk}
    </Badge>
  );
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return (
    <Badge variant="outline" className={GOAL_STATUS_BADGE_CLASSES[status]}>
      {status}
    </Badge>
  );
}

export function PsychologyPatientChart({
  patientId,
  initialSessions,
  initialGoals,
  onRefresh,
}: PsychologyPatientChartProps) {
  const { hasPermission } = usePermission();
  const canDelete = hasPermission("psychology.delete");

  const [sessions, setSessions] =
    useState<PsychologySessionRecord[]>(initialSessions);
  const [goals, setGoals] = useState<PsychologyGoalRecord[]>(initialGoals);

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );

  const [sessionForm, setSessionForm] =
    useState<SessionFormState>(EMPTY_SESSION_FORM);
  const [goalForm, setGoalForm] = useState<GoalFormState>(EMPTY_GOAL_FORM);

  const [isSavingSession, startSavingSession] = useTransition();
  const [isSavingGoal, startSavingGoal] = useTransition();
  const [isUpdatingGoalStatus, startUpdatingGoalStatus] = useTransition();
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  function handleSaveSession() {
    startSavingSession(async () => {
      const result = await createPsychologySession(patientId, {
        sessionType: sessionForm.sessionType as
          "INDIVIDUAL" | "GROUP" | "COUPLE" | "FAMILY",
        moodRating: sessionForm.moodRating
          ? Number(sessionForm.moodRating)
          : undefined,
        anxietyLevel: sessionForm.anxietyLevel
          ? Number(sessionForm.anxietyLevel)
          : undefined,
        riskAssessment: (sessionForm.riskAssessment as RiskLevel) || undefined,
        chiefComplaint: sessionForm.chiefComplaint.trim() || undefined,
        sessionNotes: sessionForm.sessionNotes.trim() || undefined,
        therapeuticApproach:
          sessionForm.therapeuticApproach.trim() || undefined,
        homeworkAssigned: sessionForm.homeworkAssigned.trim() || undefined,
        nextSessionGoals: sessionForm.nextSessionGoals.trim() || undefined,
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
    void deletePsychologySession(id).then((result) => {
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

  function handleSaveGoal() {
    if (!goalForm.description.trim()) {
      toast.error("Goal description is required");
      return;
    }
    startSavingGoal(async () => {
      const result = await createPsychologyGoal(patientId, {
        description: goalForm.description.trim(),
        targetDate: goalForm.targetDate
          ? new Date(goalForm.targetDate)
          : undefined,
        progress: goalForm.progress.trim() || undefined,
      });
      if (result.success) {
        toast.success("Goal added");
        setGoals((prev) => [result.data, ...prev]);
        setGoalForm(EMPTY_GOAL_FORM);
        setShowGoalForm(false);
        onRefresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleUpdateGoalStatus(id: string, status: GoalStatus) {
    startUpdatingGoalStatus(async () => {
      const result = await updatePsychologyGoal(id, { status });
      if (result.success) {
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? { ...g, status } : g)),
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteGoal(id: string) {
    setDeletingGoalId(id);
    void deletePsychologyGoal(id).then((result) => {
      setDeletingGoalId(null);
      if (result.success) {
        toast.success("Goal deleted");
        setGoals((prev) => prev.filter((g) => g.id !== id));
        onRefresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Goals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Therapeutic Goals</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowGoalForm((v) => !v)}
          >
            {showGoalForm ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showGoalForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">New Goal</p>
              <div className="flex flex-col gap-1">
                <Label htmlFor="g-desc">Description *</Label>
                <Input
                  id="g-desc"
                  placeholder="Describe the therapeutic goal..."
                  value={goalForm.description}
                  onChange={(e) =>
                    setGoalForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="g-target">Target Date (optional)</Label>
                <Input
                  id="g-target"
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) =>
                    setGoalForm((f) => ({ ...f, targetDate: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="g-progress">Progress Notes (optional)</Label>
                <Textarea
                  id="g-progress"
                  placeholder="Current progress..."
                  value={goalForm.progress}
                  onChange={(e) =>
                    setGoalForm((f) => ({ ...f, progress: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveGoal}
                disabled={isSavingGoal}
              >
                {isSavingGoal ? "Saving..." : "Add Goal"}
              </Button>
            </div>
          )}

          {goals.length === 0 && !showGoalForm ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No therapeutic goals defined yet.
            </p>
          ) : (
            <div className="divide-y">
              {goals.map((goal) => (
                <div key={goal.id} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium">{goal.description}</p>
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground">
                          Target:{" "}
                          {new Date(goal.targetDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      )}
                      {goal.progress && (
                        <p className="text-xs text-muted-foreground">
                          {goal.progress}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <GoalStatusBadge status={goal.status} />
                      <Select
                        value={goal.status}
                        onValueChange={(value) =>
                          handleUpdateGoalStatus(goal.id, value as GoalStatus)
                        }
                        disabled={isUpdatingGoalStatus}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GOAL_STATUS_OPTIONS.map((option) => (
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
                          disabled={deletingGoalId === goal.id}
                          onClick={() => handleDeleteGoal(goal.id)}
                          aria-label="Delete goal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Session Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>New Session</CardTitle>
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
              <Label htmlFor="s-type">Session Type</Label>
              <Select
                value={sessionForm.sessionType}
                onValueChange={(value) =>
                  setSessionForm((f) => ({ ...f, sessionType: value }))
                }
              >
                <SelectTrigger id="s-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-mood">Mood 1–10</Label>
              <Input
                id="s-mood"
                type="number"
                min={1}
                max={10}
                placeholder="e.g. 7"
                value={sessionForm.moodRating}
                onChange={(e) =>
                  setSessionForm((f) => ({ ...f, moodRating: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-anxiety">Anxiety 1–10</Label>
              <Input
                id="s-anxiety"
                type="number"
                min={1}
                max={10}
                placeholder="e.g. 4"
                value={sessionForm.anxietyLevel}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    anxietyLevel: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-risk">Risk Assessment</Label>
              <Select
                value={sessionForm.riskAssessment}
                onValueChange={(value) =>
                  setSessionForm((f) => ({ ...f, riskAssessment: value }))
                }
              >
                <SelectTrigger id="s-risk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="s-notes">
                Session Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (confidential clinical notes)
                </span>
              </Label>
              <Textarea
                id="s-notes"
                placeholder="Clinical notes — confidential..."
                value={sessionForm.sessionNotes}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    sessionNotes: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-approach">Therapeutic Approach</Label>
              <Input
                id="s-approach"
                placeholder="e.g. CBT, DBT, psychodynamic..."
                value={sessionForm.therapeuticApproach}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    therapeuticApproach: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-homework">Homework Assigned</Label>
              <Textarea
                id="s-homework"
                placeholder="Tasks assigned for next session..."
                value={sessionForm.homeworkAssigned}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    homeworkAssigned: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="s-next">Next Session Goals</Label>
              <Textarea
                id="s-next"
                placeholder="Goals for the next session..."
                value={sessionForm.nextSessionGoals}
                onChange={(e) =>
                  setSessionForm((f) => ({
                    ...f,
                    nextSessionGoals: e.target.value,
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground capitalize">
                            {session.sessionType.toLowerCase()}
                          </span>
                          {session.moodRating != null && (
                            <span className="text-xs text-muted-foreground">
                              Mood: {session.moodRating}/10
                            </span>
                          )}
                          {session.anxietyLevel != null && (
                            <span className="text-xs text-muted-foreground">
                              Anxiety: {session.anxietyLevel}/10
                            </span>
                          )}
                          <RiskBadge risk={session.riskAssessment} />
                        </div>
                        {session.chiefComplaint && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {session.chiefComplaint}
                          </p>
                        )}
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
                        {session.sessionNotes && (
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Session Notes (Confidential)
                            </span>
                            <p className="text-sm mt-0.5">
                              {session.sessionNotes}
                            </p>
                          </div>
                        )}
                        {session.therapeuticApproach && (
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Therapeutic Approach
                            </span>
                            <p className="text-sm mt-0.5">
                              {session.therapeuticApproach}
                            </p>
                          </div>
                        )}
                        {session.homeworkAssigned && (
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Homework Assigned
                            </span>
                            <p className="text-sm mt-0.5">
                              {session.homeworkAssigned}
                            </p>
                          </div>
                        )}
                        {session.nextSessionGoals && (
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              Next Session Goals
                            </span>
                            <p className="text-sm mt-0.5">
                              {session.nextSessionGoals}
                            </p>
                          </div>
                        )}
                        {!session.sessionNotes &&
                          !session.therapeuticApproach &&
                          !session.homeworkAssigned &&
                          !session.nextSessionGoals && (
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
    </div>
  );
}
