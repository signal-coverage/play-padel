"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { BookingConfirmDesktopDialog } from "./components/BookingConfirmDesktopDialog";
import { BookingConfirmMobileDrawer } from "./components/BookingConfirmMobileDrawer";
import type { BookingConfirmDialogProps } from "./types";

/**
 * Shows the booking confirmation as a centered dialog on larger viewports and
 * as a bottom-sheet drawer on small/mobile viewports, since a Dialog is
 * cramped and hard to reach one-handed at phone widths.
 */
export function BookingConfirmDialog(props: BookingConfirmDialogProps) {
  const isMobile = useIsMobile();

  return isMobile ? (
    <BookingConfirmMobileDrawer {...props} />
  ) : (
    <BookingConfirmDesktopDialog {...props} />
  );
}
