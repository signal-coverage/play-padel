"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupBuilderProps } from "./types";

// Deliberately NOT translated — this generates the actual `groupName` value
// persisted for a manually-built group (see onSaveManual below), which must
// stay byte-identical to the backend's own hardcoded English pattern for
// automatically-generated groups (core/tournaments/services/groups.service.ts's
// `Group ${String.fromCharCode(65 + groupIndex)}`) so manual and automatic
// group naming stay consistent regardless of the owner's locale.
function groupLabelFor(index: number): string {
  return `Group ${String.fromCharCode(65 + index)}`;
}

/**
 * Owner group-building tool: either "Generate groups automatically" (calls
 * distributeTeamsIntoGroups server-side via onGenerateAutomatic), or a
 * simple per-team <select> assignment ("your call... a simple assign-via-
 * select-per-team list is enough for v1" — see the task's own note; a native
 * <select> is used instead of the shadcn Select primitive specifically for
 * simpler, more reliable test coverage, not styling preference).
 */
export function GroupBuilder({
  teams,
  groups,
  groupCount,
  isLocked,
  onGenerateAutomatic,
  isGeneratingAutomatic,
  onSaveManual,
  isSavingManual,
  onLock,
  isLocking,
}: GroupBuilderProps) {
  const t = useTranslations("GroupBuilder");
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const groupOptions = useMemo(
    () =>
      Array.from({ length: Math.max(groupCount, 1) }, (_, i) =>
        groupLabelFor(i),
      ),
    [groupCount],
  );

  const groupsExist = groups.length > 0;

  function handleAssignmentChange(teamId: string, groupName: string) {
    setAssignments((prev) => ({ ...prev, [teamId]: groupName }));
  }

  function handleSaveManual() {
    const byGroup = new Map<string, string[]>();
    for (const team of teams) {
      const groupName = assignments[team.id];
      if (!groupName) continue;
      const list = byGroup.get(groupName) ?? [];
      list.push(team.id);
      byGroup.set(groupName, list);
    }
    onSaveManual(
      Array.from(byGroup.entries()).map(([groupName, teamIds]) => ({
        groupName,
        teamIds,
      })),
    );
  }

  const everyTeamAssigned =
    teams.length > 0 && teams.every((team) => Boolean(assignments[team.id]));

  if (groupsExist) {
    const teamsById = new Map(teams.map((team) => [team.id, team]));
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("groupsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              <p className="text-sm font-medium">{group.name}</p>
              <ul className="text-sm text-muted-foreground">
                {group.teamIds.map((teamId) => {
                  const team = teamsById.get(teamId);
                  return (
                    <li key={teamId}>
                      {team
                        ? `${team.player1DisplayName} / ${team.player2DisplayName}`
                        : teamId}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <Button
            type="button"
            onClick={onLock}
            disabled={isLocked || isLocking}
          >
            {isLocked
              ? t("groupsLocked")
              : isLocking
                ? t("locking")
                : t("lockGroups")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("buildGroupsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          onClick={onGenerateAutomatic}
          disabled={isGeneratingAutomatic || teams.length === 0}
        >
          {isGeneratingAutomatic
            ? t("generatingAutomatic")
            : t("generateAutomatic")}
        </Button>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t("manualAssignHint")}
          </p>
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("noRegisteredTeams")}
            </p>
          )}
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm">
                {team.player1DisplayName} / {team.player2DisplayName}
              </span>
              <select
                aria-label={t("groupForTeamAriaLabel", {
                  teamName: `${team.player1DisplayName} / ${team.player2DisplayName}`,
                })}
                className="rounded-sm border bg-background px-2 py-1 text-sm"
                value={assignments[team.id] ?? ""}
                onChange={(e) =>
                  handleAssignmentChange(team.id, e.target.value)
                }
              >
                <option value="">{t("unassignedOption")}</option>
                {groupOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveManual}
            disabled={!everyTeamAssigned || isSavingManual}
          >
            {isSavingManual ? t("savingGroups") : t("saveGroups")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
