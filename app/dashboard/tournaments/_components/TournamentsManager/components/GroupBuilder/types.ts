import type { CategoryGroup, CategoryTeam } from "../../types";

export type GroupBuilderProps = {
  teams: CategoryTeam[];
  groups: CategoryGroup[];
  groupCount: number;
  isLocked: boolean;
  onGenerateAutomatic: () => void;
  isGeneratingAutomatic: boolean;
  onSaveManual: (groups: { groupName: string; teamIds: string[] }[]) => void;
  isSavingManual: boolean;
  onLock: () => void;
  isLocking: boolean;
};
