import type { ClubClosure } from "../../types";

export type ClubClosuresListProps = {
  closures: ClubClosure[];
  onCancel: (closureId: string) => void;
  cancellingClosureId: string | null;
};
