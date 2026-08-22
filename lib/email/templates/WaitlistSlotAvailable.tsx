import {
  Body,
  Button,
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

interface WaitlistSlotAvailableProps {
  userName: string;
  courtName: string;
  scheduledStart: Date;
  clubId: string;
  courtId: string;
  dateKey: string;
}

export function WaitlistSlotAvailable({
  userName,
  courtName,
  scheduledStart,
  clubId,
  courtId,
  dateKey,
}: WaitlistSlotAvailableProps) {
  const formattedDate = scheduledStart.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledStart.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const bookingUrl = `https://playpadel.app/dashboard/browse?club=${clubId}&court=${courtId}&date=${dateKey}`;

  return (
    <Html>
      <Head />
      <Preview>A slot you were waiting for just opened up</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>A Slot Just Opened Up</Heading>
          <Text style={text}>Hello {userName},</Text>
          <Text style={text}>
            Good news — a slot you asked to be notified about is now free:
          </Text>
          <Section style={infoBox}>
            <Text style={infoLine}>
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={infoLine}>
              <strong>Time:</strong> {formattedTime}
            </Text>
            <Text style={infoLine}>
              <strong>Court:</strong> {courtName}
            </Text>
          </Section>
          <Section style={{ marginTop: "24px" }}>
            <Button style={button} href={bookingUrl}>
              Book it now
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            This slot is available on a first-come, first-served basis — other
            players may have also asked to be notified.
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
const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
};
const hr = { borderColor: "#e5e7eb", margin: "20px 0" };
const footer = { color: "#6b7280", fontSize: "12px" };
