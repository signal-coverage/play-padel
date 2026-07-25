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
};

/** One rendered grid row: a single point in time plus the matching slot (if any) per court. */
export type TimeRow = {
  key: string;
  time: Date;
  slotsByCourtId: Map<string, Slot>;
};
