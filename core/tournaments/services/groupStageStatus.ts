// Pure, framework-free logic. Kept as its own module rather than folded into
// standings.service.ts because it has no Prisma dependency and belongs with
// this file's other framework-free siblings.

export interface GroupStageMatchInput {
  status: string;
}

/**
 * True once every match in a group has reached a resolved state — COMPLETED
 * or WALKOVER produce a real score/winner, and CANCELLED is treated as
 * resolved too since a cancelled match will never produce one either (it
 * simply never blocks the group from being considered "done"). Only
 * SCHEDULED still blocks completion. An empty match list counts as complete
 * (vacuously true) — flagged: this hasn't been paired with a specific caller
 * yet, so `use your judgment` per the task; a group with genuinely zero
 * matches should never occur once setGroupsManually/
 * generateGroupsAutomatically persist a group with 2+ teams.
 */
export function isGroupStageComplete(matches: GroupStageMatchInput[]): boolean {
  return matches.every(
    (match) =>
      match.status === "COMPLETED" ||
      match.status === "WALKOVER" ||
      match.status === "CANCELLED",
  );
}
