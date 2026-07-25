import type { Professional } from "@/core/professionals/types";

export interface ProfessionalsPageState {
  professionals: Professional[];
  total: number;
  loading: boolean;
  sheetOpen: boolean;
  editingProfessional: Professional | undefined;
  deactivateTargetId: string | null;
}
