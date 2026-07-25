import type { CourtAvailabilityGridVariant, Slot } from "../../types";

export type SlotCellProps = {
  slot: Slot | undefined;
  courtId: string;
  variant: CourtAvailabilityGridVariant;
  onSlotClick?: (courtId: string, slot: Slot) => void;
};
