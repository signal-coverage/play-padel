// Pure, framework-free logic — see the plan's "balanced by the pair's
// padelCategory, standard serpentine/snake seeding" decision.
//
// Convention reminder (app/onboarding/types.ts:23-24): LOWER padelCategory
// number = STRONGER player, so ascending `combinedCategoryLevel` puts the
// strongest teams first.

export interface DistributableTeam {
  id: string;
  combinedCategoryLevel: number | null;
}

export interface GroupAssignment {
  groupIndex: number;
  teamId: string;
}

/**
 * Builds the serpentine (snake-draft) group index for the Nth team dealt,
 * 0-indexed: 0,1,2,...,groupCount-1,groupCount-1,...,2,1,0,0,1,2,... — each
 * full forward+backward pass deals `2 * groupCount` teams, keeping every
 * group's average strength balanced. A leftover/partial final pass (odd
 * total team count) simply continues wherever the snake currently sits,
 * same as a standard snake draft.
 */
function serpentineGroupIndexFor(position: number, groupCount: number): number {
  const passLength = groupCount * 2;
  const positionInPass = position % passLength;
  return positionInPass < groupCount
    ? positionInPass
    : passLength - 1 - positionInPass;
}

/**
 * Sorts teams strongest-first (ascending combinedCategoryLevel; null/
 * unranked teams sort last, in their original relative order) and deals them
 * into `groupCount` groups via serpentine seeding.
 */
export function distributeTeamsIntoGroups(
  teams: DistributableTeam[],
  groupCount: number,
): GroupAssignment[] {
  if (teams.length === 0 || groupCount <= 0) return [];

  const ranked = teams
    .map((team, originalIndex) => ({ team, originalIndex }))
    .sort((a, b) => {
      const levelA = a.team.combinedCategoryLevel;
      const levelB = b.team.combinedCategoryLevel;
      if (levelA === null && levelB === null) {
        return a.originalIndex - b.originalIndex;
      }
      if (levelA === null) return 1;
      if (levelB === null) return -1;
      return levelA - levelB;
    });

  return ranked.map(({ team }, position) => ({
    groupIndex: serpentineGroupIndexFor(position, groupCount),
    teamId: team.id,
  }));
}
