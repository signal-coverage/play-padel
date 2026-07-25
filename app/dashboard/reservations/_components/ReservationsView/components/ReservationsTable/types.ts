import type {
  ReservationActionKind,
  ReservationRecord,
} from "../../types";

export type ReservationsTableProps = {
  reservations: ReservationRecord[];
  isLoading: boolean;
  onAction: (reservationId: string, action: ReservationActionKind) => void;
  pendingReservationId: string | null;
};
