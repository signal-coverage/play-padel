import type { ReservationActionKind } from "../../types";

export type ReservationActionButtonsProps = {
  reservationId: string;
  onAction: (reservationId: string, action: ReservationActionKind) => void;
  isPending: boolean;
  /** `sm` for dense contexts (e.g. a table row); defaults to the standard
   * Button size for roomier contexts (e.g. a dialog footer). */
  size?: "default" | "sm";
};
