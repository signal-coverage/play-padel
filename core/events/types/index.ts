export type CoreEventPayloads = {
  "patient.created": {
    patientId: string;
    organizationId: string;
    createdBy: string;
  };
  "patient.updated": {
    patientId: string;
    organizationId: string;
    updatedBy: string;
  };
  "appointment.created": {
    appointmentId: string;
    organizationId: string;
    patientId: string;
    professionalId: string;
  };
  "appointment.status_changed": {
    appointmentId: string;
    organizationId: string;
    patientId: string;
    professionalId: string;
    status: string;
    previousStatus: string;
  };
  "invoice.issued": {
    invoiceId: string;
    organizationId: string;
    patientId: string;
    amount: number;
  };
  "invoice.paid": {
    invoiceId: string;
    organizationId: string;
    patientId: string;
    amount: number;
    method: string;
  };
};

export type CoreEventName = keyof CoreEventPayloads;
export type CoreEventHandler<T extends CoreEventName> = (
  payload: CoreEventPayloads[T],
) => Promise<void> | void;
