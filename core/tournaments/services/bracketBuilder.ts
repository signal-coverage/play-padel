// Pure, framework-free logic — see the plan's "Knockout + standings" (build
// order slice 3) decisions: byes for non-power-of-2 counts (top seeds get
// byes first), a fixed KnockoutRound label ladder capping a category at 32
// teams, and single-elimination bracket progression pointers.

export type KnockoutRoundLabel =
  "ROUND_OF_32" | "ROUND_OF_16" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL";

// Ladder in play order — a bracket's first round is whichever suffix of this
// array fits its size (see roundLabelsForBracketSize).
const ROUND_LABEL_LADDER: KnockoutRoundLabel[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "FINAL",
];

export interface BracketMatchSpec {
  round: KnockoutRoundLabel;
  // 0-indexed position into buildKnockoutBracket's input array. Only ever
  // set for a first-round match (later rounds are TBD until their feeder
  // matches resolve) — undefined means "no team known yet at build time",
  // which is either a still-open bracket slot (advances later) or, in a
  // first-round match, the empty side of a bye.
  seedIndexA?: number;
  seedIndexB?: number;
  // True for a first-round match with only one real team seeded in — the
  // "match" auto-advances that team with no game played (see the plan's
  // "represent a bye as a match needing only one team, auto-advancing").
  isBye: boolean;
  // Index into the array buildKnockoutBracket returns, and which of that
  // match's two slots this match's winner fills. null only for the FINAL.
  nextMatchIndex: number | null;
  nextMatchSlot: "A" | "B" | null;
}

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return Math.max(size, 2);
}

/**
 * Standard single-elimination seeding order for a bracket of `size` slots
 * (size must be a power of 2): the classic recursive placement where seed 1
 * meets seed `size`, seed 2 meets seed `size - 1`, etc., arranged so the
 * strongest seeds can only meet as late as possible (1 and 2 can't meet
 * before the FINAL, 1-4 can't meet before the SEMIFINAL, and so on).
 * Returns 1-indexed seed numbers in bracket-position order, e.g. for size=8:
 * [1, 8, 4, 5, 2, 7, 3, 6] (round-1 pairs: 1v8, 4v5, 2v7, 3v6).
 */
function standardSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, sum - seed);
    }
    order = next;
  }
  return order;
}

/**
 * The round-label sequence (first round -> FINAL) for a bracket of `size`
 * slots. Throws if `size` exceeds the ladder's largest supported bracket
 * (32 — see the plan's "KnockoutRound is a fixed enum ... caps a category at
 * 32 teams" decision).
 */
function roundLabelsForBracketSize(size: number): KnockoutRoundLabel[] {
  const totalRounds = Math.log2(size);
  if (
    !Number.isInteger(totalRounds) ||
    totalRounds > ROUND_LABEL_LADDER.length
  ) {
    throw new Error(
      `Cannot build a knockout bracket for ${size} slots — a category is capped at 32 teams.`,
    );
  }
  return ROUND_LABEL_LADDER.slice(ROUND_LABEL_LADDER.length - totalRounds);
}

/**
 * Builds a full single-elimination bracket from `seededTeamIds` — already
 * ordered best-seed-first by the caller (see matches.service.ts's
 * generateKnockoutBracket for the group-standings-derived interleaving).
 * Only the array's length/positions matter here (`seedIndexA/B` are indices
 * into it, not the ids themselves) — the service layer maps them to real
 * team/match ids after this returns.
 *
 * 0 or 1 team produces no matches at all (a lone team is a trivial champion
 * with nothing to play — the caller handles that directly). Otherwise pads
 * up to the next power of 2 with byes, using the standard seeding order so
 * the strongest seeds receive the byes first.
 */
export function buildKnockoutBracket(
  seededTeamIds: string[],
): BracketMatchSpec[] {
  const n = seededTeamIds.length;
  if (n <= 1) return [];

  const bracketSize = nextPowerOfTwo(n);
  const seedPositions = standardSeedOrder(bracketSize).map((seed) => seed - 1);
  const roundLabels = roundLabelsForBracketSize(bracketSize);
  const totalRounds = roundLabels.length;

  const matches: BracketMatchSpec[] = [];
  const roundStartIndex: number[] = [];
  let matchesInRound = bracketSize / 2;

  for (let round = 0; round < totalRounds; round++) {
    roundStartIndex.push(matches.length);

    for (let i = 0; i < matchesInRound; i++) {
      if (round === 0) {
        const seedA = seedPositions[i * 2];
        const seedB = seedPositions[i * 2 + 1];
        const aIsReal = seedA < n;
        const bIsReal = seedB < n;
        matches.push({
          round: roundLabels[round],
          seedIndexA: aIsReal ? seedA : undefined,
          seedIndexB: bIsReal ? seedB : undefined,
          isBye: aIsReal !== bIsReal,
          nextMatchIndex: null,
          nextMatchSlot: null,
        });
      } else {
        matches.push({
          round: roundLabels[round],
          seedIndexA: undefined,
          seedIndexB: undefined,
          isBye: false,
          nextMatchIndex: null,
          nextMatchSlot: null,
        });
      }
    }

    matchesInRound = matchesInRound / 2;
  }

  for (let round = 0; round < totalRounds - 1; round++) {
    const thisRoundStart = roundStartIndex[round];
    const nextRoundStart = roundStartIndex[round + 1];
    const countThisRound = nextRoundStart - thisRoundStart;

    for (let i = 0; i < countThisRound; i++) {
      const matchIndex = thisRoundStart + i;
      matches[matchIndex].nextMatchIndex = nextRoundStart + Math.floor(i / 2);
      matches[matchIndex].nextMatchSlot = i % 2 === 0 ? "A" : "B";
    }
  }

  return matches;
}

/**
 * Where a match's winner goes next. Pure pointer-following — the service
 * layer resolves nextMatchId to a real persisted match id and writes
 * winnerTeamId into the returned slot's teamA/teamBId. Returns null when
 * there's nothing to advance into (the FINAL) or when no real winner was
 * given.
 */
export function advanceWinner(
  match: { nextMatchId: string | null; nextMatchSlot: string | null },
  winnerTeamId: string,
): { matchId: string; slot: "A" | "B" } | null {
  if (!winnerTeamId) return null;
  if (!match.nextMatchId) return null;
  if (match.nextMatchSlot !== "A" && match.nextMatchSlot !== "B") return null;

  return { matchId: match.nextMatchId, slot: match.nextMatchSlot };
}
