import type { ReservationActionKind } from "../../types";

export type ReservationActionButtonsProps = {
  reservationId: string;
  onAction: (reservationId: string, action: ReservationActionKind) => void;
  isPending: boolean;
  /** `sm` for dense contexts (e.g. a table row); defaults to the standard
   * Button size for roomier contexts (e.g. a dialog footer). */
  size?: "default" | "sm";
  /** Renders a "Confirm transfer" button first, ahead of the standard trio,
   * for a pending unexpired bank-transfer hold. Callers compute this via
   * `needsTransferConfirmation` (see ../../utils). */
  showConfirmTransfer?: boolean;
};
