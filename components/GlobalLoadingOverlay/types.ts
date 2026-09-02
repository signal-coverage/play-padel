export type GlobalLoadingOverlayProps = {
  open: boolean;
  // Shown under the bouncing ball — override per action (e.g. "Saving…",
  // "Uploading…") so the overlay reads as specific to what's actually
  // happening, not a generic spinner.
  label?: string;
};
