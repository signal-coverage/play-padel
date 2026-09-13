export type ClubClosure = {
  id: string;
  courtId: string;
  courtName: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdAt: Date;
  createdBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
};

export type RawClubClosure = {
  id: string;
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
  createdBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
};
