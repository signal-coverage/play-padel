import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface ClientBirthdayProps {
  patientFirstName: string;
}

export function ClientBirthday({ patientFirstName }: ClientBirthdayProps) {
  return (
    <Html>
      <Head />
      <Preview>Happy Birthday, {patientFirstName}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Happy Birthday! 🎉</Heading>
          <Text style={text}>Hello {patientFirstName},</Text>
          <Text style={text}>
            Wishing you a wonderful birthday filled with joy and good health!
          </Text>
          <Text style={text}>
            Thank you for being part of our practice. We hope this special day
            brings you everything you deserve.
          </Text>
          <Text style={footer}>Warm regards, your care team.</Text>
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
const footer = { color: "#6b7280", fontSize: "12px" };
