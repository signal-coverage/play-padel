import { Badge } from "@/components/ui/badge";
import {
  RESERVATION_STATUS_LABELS,
  STATUS_BADGE_VARIANT,
} from "@/core/reservations/consts";
import type { ReservationStatusBadgeProps } from "./types";

/**
 * Renders a reservation's status as a `Badge`, looking up the variant and
 * label from the shared `STATUS_BADGE_VARIANT`/`RESERVATION_STATUS_LABELS`
 * maps so a given status always renders identically for both the player
 * ("my-reservations") and owner ("reservations") screens.
 */
export function ReservationStatusBadge({
  status,
}: ReservationStatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {RESERVATION_STATUS_LABELS[status]}
    </Badge>
  );
}
