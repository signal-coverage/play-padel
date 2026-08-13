import type { Slot } from "@/components/CourtAvailabilityGrid";

export type BookingConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtName: string;
  slot: Slot | null;
  isSubmitting: boolean;
  requiresPrepayment: boolean;
  onConfirm: () => void;
};
