export type Marker = "green" | "red";

export type UpcomingItem = {
  id: string;
  courtName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
  canSelfCancel: boolean;
  // Owner-only: who booked this slot. Players never see this on their own
  // list — there's no reason to show yourself your own name.
  userName?: string;
};
