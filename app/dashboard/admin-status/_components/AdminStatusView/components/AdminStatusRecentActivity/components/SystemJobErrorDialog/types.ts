export type SystemJobErrorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobLabel: string;
  when: string;
  errorMessage: string;
};
