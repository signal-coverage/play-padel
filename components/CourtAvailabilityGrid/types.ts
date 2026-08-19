export type SlotStatus = "free" | "locked" | "closed";

export type Slot = {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
  closureReason?: string;
  /** Only meaningful when status is "locked" — true if the current player has an active waitlist entry for this exact slot. */
  waitlisted?: boolean;
};

export type CourtColumn = {
  id: string;
  name: string;
  /** Per-reservation fee, when the court has one configured (undefined means "not set"; 0 means genuinely free — the two are not the same). */
  reservationFee?: number;
  /** Free-text surface/field type (e.g. "clay", "cristal"). Only read by Browse Courts' court-metadata panel — CourtAvailabilityGrid itself never displays this. */
  surface?: string;
  /** Court accent color (hex-ish string, same convention as the owner-side CourtsTable swatch). Only read by Browse Courts' court-metadata panel. */
  color?: string;
  /** Whether the court is indoor. Only read by Browse Courts' court-metadata panel. */
  indoor?: boolean;
  /** Owner-uploaded photo URL, if any. Only read by Browse Courts' court-metadata panel. */
  photoUrl?: string;
  /** The court's total/base price, if the owner has set one. Only read by Browse Courts' court-metadata panel. */
  courtPrice?: number;
  /** Needed alongside courtPrice to derive a $/hour figure. Only read by Browse Courts' court-metadata panel. */
  slotDurationMinutes?: number;
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
  /** Renders a "Notify me" affordance on locked slots for the "player" variant only, instead of the plain non-interactive "Locked" label. Omit to render locked slots exactly as before (no waitlist UI at all) — this is how the owner-side variant, which never passes this prop, stays completely unaffected. */
  onJoinWaitlist?: (courtId: string, slot: Slot) => void;
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
  /**
   * When true, suppresses the grid's own internal day navigator (for
   * callers that render their own shared one elsewhere). Defaults to
   * false/undefined.
   */
  hideDayNavigator?: boolean;
};

/** One rendered grid row: a single point in time plus the matching slot (if any) per court. */
export type TimeRow = {
  key: string;
  time: Date;
  slotsByCourtId: Map<string, Slot>;
};
