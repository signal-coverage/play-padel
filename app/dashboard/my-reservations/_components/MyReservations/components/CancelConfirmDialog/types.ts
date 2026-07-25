import type { CancelTarget } from "../../types";

export type CancelConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CancelTarget | null;
  isSubmitting: boolean;
  onConfirm: () => void;
};
