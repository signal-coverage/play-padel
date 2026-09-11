export type WalkoverDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamAId: string;
  teamALabel: string;
  teamBId: string;
  teamBLabel: string;
  onConfirm: (winningTeamId: string) => Promise<void>;
  isSubmitting: boolean;
};
