import type { Plan } from "@/core/clubs/types";

export type CourtLimitReachedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  limit: number;
};
