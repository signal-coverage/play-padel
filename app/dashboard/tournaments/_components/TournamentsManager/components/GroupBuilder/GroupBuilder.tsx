"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupBuilderProps } from "./types";

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
          <CardTitle>Groups</CardTitle>
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
              ? "Groups locked"
              : isLocking
                ? "Locking…"
                : "Lock groups"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build groups</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          onClick={onGenerateAutomatic}
          disabled={isGeneratingAutomatic || teams.length === 0}
        >
          {isGeneratingAutomatic
            ? "Generating…"
            : "Generate groups automatically"}
        </Button>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Or assign each team to a group manually:
          </p>
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No registered teams yet.
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
                aria-label={`Group for ${team.player1DisplayName} / ${team.player2DisplayName}`}
                className="rounded-sm border bg-background px-2 py-1 text-sm"
                value={assignments[team.id] ?? ""}
                onChange={(e) =>
                  handleAssignmentChange(team.id, e.target.value)
                }
              >
                <option value="">Unassigned</option>
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
            {isSavingManual ? "Saving…" : "Save groups"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
