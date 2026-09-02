export type DisconnectConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
};
