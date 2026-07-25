import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InvoicePaidProps {
  patientName: string;
  invoiceNumber: number;
  total: number;
  currency: string;
}

export function InvoicePaid({
  patientName,
  invoiceNumber,
  total,
  currency,
}: InvoicePaidProps) {
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(total);

  return (
    <Html>
      <Head />
      <Preview>Payment received for invoice #{String(invoiceNumber)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Received</Heading>
          <Text style={text}>Hello {patientName},</Text>
          <Text style={text}>We have received your payment. Thank you!</Text>
          <Section style={infoBox}>
            <Text style={infoLine}>
              <strong>Invoice #:</strong> {invoiceNumber}
            </Text>
            <Text style={infoLine}>
              <strong>Amount paid:</strong> {formattedTotal}
            </Text>
            <Text style={infoLine}>
              <strong>Status:</strong> Paid
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Please keep this email as your payment confirmation.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px",
  maxWidth: "600px",
};
const h1 = { color: "#1a1a1a", fontSize: "24px", fontWeight: "bold" };
const text = { color: "#374151", fontSize: "14px", lineHeight: "24px" };
const infoBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "16px",
};
const infoLine = { color: "#374151", fontSize: "14px", margin: "4px 0" };
const hr = { borderColor: "#e5e7eb", margin: "20px 0" };
const footer = { color: "#6b7280", fontSize: "12px" };
