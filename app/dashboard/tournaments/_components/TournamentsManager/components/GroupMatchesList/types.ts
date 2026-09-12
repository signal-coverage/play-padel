import type { GroupMatch } from "../../types";

export type GroupMatchesListProps = {
  matches: GroupMatch[];
  teamLabels: Record<string, string>;
  // Optional — omitted (or ignored via readOnly) for the player-facing
  // read-only view, which has nothing to trigger these dialogs from.
  onEnterScore?: (match: GroupMatch) => void;
  onRecordWalkover?: (match: GroupMatch) => void;
  readOnly?: boolean;
};
