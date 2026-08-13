import { MercadoPagoConfig } from "mercadopago";

let client: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (!client) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    }
    client = new MercadoPagoConfig({ accessToken });
  }
  return client;
}
