import type { PlayerReservation } from "../../types";

export type ReservationRowProps = {
  reservation: PlayerReservation;
  onCancel: () => void;
};
