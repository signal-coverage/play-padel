import type { PendingClub } from "../../types";

export type RejectConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PendingClub | null;
  isSubmitting: boolean;
  onConfirm: () => void;
};
