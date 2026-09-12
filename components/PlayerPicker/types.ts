export type PlayerCandidate = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type PlayerPickerProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  // The signed-in user's own id — never offered as a candidate (no
  // self-tagging). Matches PartnerPicker's original exclusion rule.
  excludeUserId?: string;
  // Maximum number of candidates that may be selected at once. No default —
  // this is a shared primitive with very different callers (max === 1 for
  // single-select tournament-partner registration, max > 1 for multi-select
  // reservation co-player tagging), so every caller must decide explicitly.
  max: number;
};
