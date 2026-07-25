import type { Professional } from "@/core/professionals/types";

export interface ProfessionalTableProps {
  professionals: Professional[];
  onEdit: (id: string) => void;
  onDeactivate: (id: string) => void;
  isLoading: boolean;
}
