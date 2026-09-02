export type BulkEditCourtsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtIds: string[];
  courtCount: number;
  onSuccess: () => void;
};

export type BulkEditFormValues = {
  surface: { enabled: boolean; value: string };
  indoor: { enabled: boolean; value: boolean };
  color: { enabled: boolean; value: string };
  slotDurationMinutes: { enabled: boolean; value: number };
  reservationFee: { enabled: boolean; value: number };
  courtPrice: { enabled: boolean; value: number };
  active: { enabled: boolean; value: boolean };
};
