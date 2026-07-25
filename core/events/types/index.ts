export type CoreEventPayloads = {
  "reservation.created": {
    reservationId: string;
    clubId: string;
    userId: string;
    courtId: string;
  };
  "reservation.status_changed": {
    reservationId: string;
    clubId: string;
    userId: string;
    courtId: string;
    status: string;
    previousStatus: string;
  };
  "invoice.issued": {
    invoiceId: string;
    clubId: string;
    userId: string;
    amount: number;
  };
  "invoice.paid": {
    invoiceId: string;
    clubId: string;
    userId: string;
    amount: number;
    method: string;
  };
};

export type CoreEventName = keyof CoreEventPayloads;
export type CoreEventHandler<T extends CoreEventName> = (
  payload: CoreEventPayloads[T],
) => Promise<void> | void;
