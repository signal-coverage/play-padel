export type SlotStatus = "free" | "locked";

export type Slot = {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
};

export type CourtColumn = {
  id: string;
  name: string;
  slots: Slot[];
};

export type CourtAvailabilityGridVariant = "owner" | "player";

export type CourtAvailabilityGridProps = {
  /** The day being displayed. Only used for the header label — slot data is trusted as-is. */
  date: Date;
  courts: CourtColumn[];
  /** Owner gets extra affordances (e.g. inspecting a locked slot); player only sees free/locked. */
  variant: CourtAvailabilityGridVariant;
  onSlotClick?: (courtId: string, slot: Slot) => void;
  /** Wires up the built-in prev/next day navigator. Omit to render it disabled. */
  onDateChange?: (date: Date) => void;
  isLoading?: boolean;
  /**
   * True while `courts` still holds the *previous* date/selection's data
   * (e.g. a placeholder shown while a new day's slots are being fetched in
   * the background). Unlike `isLoading`, this does NOT show the skeleton —
   * the grid keeps rendering the stale data, but visually de-emphasizes it
   * and stops treating slots as clickable, so a click landing mid-refetch
   * can't book against the wrong date.
   */
  isUpdating?: boolean;
  /** True when the underlying availability fetch failed. Takes priority over the empty state. */
  isError?: boolean;
  /**
   * Last-known court/column count to use for the loading skeleton while
   * `courts` is still empty (avoids a layout shift once real data arrives).
   * Falls back to `courts.length` when omitted.
   */
  columnCount?: number;
  /** Last-known time-slot row count to use for the loading skeleton. */
  rowCount?: number;
};

/** One rendered grid row: a single point in time plus the matching slot (if any) per court. */
export type TimeRow = {
  key: string;
  time: Date;
  slotsByCourtId: Map<string, Slot>;
};
