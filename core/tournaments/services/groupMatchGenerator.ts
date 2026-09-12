// Pure, framework-free logic — see the plan's "Owner group + scoring tools"
// slice. Deliberately does not schedule byes: an odd team count simply ends
// up in one fewer pairing than the rest of its group.

export interface GeneratedGroupMatch {
  teamAId: string;
  teamBId: string;
}

/**
 * Every unique unordered pairing among `teamIds`, once each — the classic
 * round-robin schedule for a single group. No self-pairing, no repeats, no
 * bye placeholder rows for an odd count.
 */
export function generateRoundRobinMatches(
  teamIds: string[],
): GeneratedGroupMatch[] {
  const matches: GeneratedGroupMatch[] = [];

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({ teamAId: teamIds[i], teamBId: teamIds[j] });
    }
  }

  return matches;
}
