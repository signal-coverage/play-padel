export type PhotoFieldProps = {
  /** Undefined in create mode — a court that doesn't exist yet has nowhere
   * to upload to, so a selected file is staged via `onFileStaged` instead of
   * uploaded immediately. */
  courtId?: string;
  /** The court's currently persisted photo URL, if any. */
  value?: string;
  /** Called with the new photo URL once an immediate (edit-mode) upload succeeds. */
  onChange: (photoUrl: string) => void;
  /** Called with the raw file when there's no `courtId` yet, so the parent
   * can upload it itself right after the court is created. */
  onFileStaged?: (file: File) => void;
};
