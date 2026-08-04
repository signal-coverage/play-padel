import type { ReservationActionKind, ReservationRecord } from "../../types";

export type SlotDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationRecord | null;
  onAction: (reservationId: string, action: ReservationActionKind) => void;
  isPending: boolean;
};
