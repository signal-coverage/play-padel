export type MercadoPagoOperationalCause = "MP_NOT_CONNECTED" | "CLUB_INACTIVE";

export type MercadoPagoOperationalStatus = {
  operational: boolean;
  cause: MercadoPagoOperationalCause | null;
};
