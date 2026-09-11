export type QuickSetupPanelProps = {
  onApply: (startTime: string, endTime: string, days: number[]) => void;
  /** Extra classes merged onto the panel's own root — e.g. the "split"
   * layout's `h-full` so it stretches to match the day list column's
   * height instead of sizing to its own (shorter) content. */
  className?: string;
};
