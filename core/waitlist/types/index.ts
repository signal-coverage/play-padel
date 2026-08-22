export type WaitlistEntryStatus = "WAITING" | "NOTIFIED";

export interface WaitlistEntry {
  id: string;
  clubId: string;
  courtId: string;
  courtName: string;
  userId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: WaitlistEntryStatus;
  notifiedAt?: Date;
  createdAt: Date;
}
