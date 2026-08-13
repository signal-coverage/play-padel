import type { CourtClosure } from "@/core/courts/types";

export type ClosuresListProps = {
  closures: CourtClosure[];
  onCancel: (closureId: string) => void;
  cancellingClosureId: string | null;
};
