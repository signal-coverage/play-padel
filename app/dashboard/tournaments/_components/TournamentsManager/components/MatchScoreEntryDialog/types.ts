export type MatchScoreEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchLabel: string;
  onSubmit: (
    sets: { setNumber: number; teamAGames: number; teamBGames: number }[],
  ) => Promise<void>;
  isSubmitting: boolean;
};
