// Pure, framework-free logic — see the plan's "full score entry (sets/games)
// by the owner, best-of-3" decision. Deliberately loose: a set is won by
// whichever side has strictly more games in it, without enforcing exact
// tennis/padel scoring (6-4/7-5/7-6) — "some clubs play short sets".

export interface MatchSetInput {
  setNumber: number;
  teamAGames: number;
  teamBGames: number;
}

export interface MatchResult {
  winner: "A" | "B" | null;
  setsWonA: number;
  setsWonB: number;
  gamesWonA: number;
  gamesWonB: number;
  isComplete: boolean;
}

const EMPTY_RESULT: MatchResult = {
  winner: null,
  setsWonA: 0,
  setsWonB: 0,
  gamesWonA: 0,
  gamesWonB: 0,
  isComplete: false,
};

/**
 * Derives the winner/set-and-game tallies from a match's sets. `isComplete`
 * becomes true the moment one side reaches 2 set wins (best-of-3); `winner`
 * stays null while incomplete. Malformed input — more than 3 sets, or extra
 * sets appended after a side already clinched 2 — is rejected wholesale
 * (zeroed-out, `isComplete: false`) rather than silently miscounted.
 */
export function deriveMatchResult(sets: MatchSetInput[]): MatchResult {
  if (sets.length === 0 || sets.length > 3) {
    return { ...EMPTY_RESULT };
  }

  const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber);

  let setsWonA = 0;
  let setsWonB = 0;
  let gamesWonA = 0;
  let gamesWonB = 0;
  let decidedBeforeLastSet = false;

  ordered.forEach((set, index) => {
    gamesWonA += set.teamAGames;
    gamesWonB += set.teamBGames;

    const isLastSet = index === ordered.length - 1;
    if (!isLastSet && (setsWonA >= 2 || setsWonB >= 2)) {
      decidedBeforeLastSet = true;
    }

    if (set.teamAGames > set.teamBGames) {
      setsWonA++;
    } else if (set.teamBGames > set.teamAGames) {
      setsWonB++;
    }
    // A tied set (equal games) is won by neither side.
  });

  if (decidedBeforeLastSet) {
    return { ...EMPTY_RESULT };
  }

  const isComplete = setsWonA >= 2 || setsWonB >= 2;
  const winner: MatchResult["winner"] = !isComplete
    ? null
    : setsWonA > setsWonB
      ? "A"
      : setsWonB > setsWonA
        ? "B"
        : null;

  return { winner, setsWonA, setsWonB, gamesWonA, gamesWonB, isComplete };
}
