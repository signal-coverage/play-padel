import type { CourtColumn, Slot } from "@/components/CourtAvailabilityGrid";

export type CourtSchedulePanelProps = {
  date: Date;
  onDateChange: (date: Date) => void;
  selectedCourt: CourtColumn | null;
  onSlotClick: (courtId: string, slot: Slot) => void;
  onJoinWaitlist: (courtId: string, slot: Slot) => void;
  isLoading: boolean;
  isUpdating: boolean;
  isError: boolean;
  rowCount: number | undefined;
};
