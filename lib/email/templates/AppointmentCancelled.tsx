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

interface AppointmentCancelledProps {
  patientName: string;
  scheduledStart: Date;
  professionalName?: string;
}

export function AppointmentCancelled({
  patientName,
  scheduledStart,
  professionalName,
}: AppointmentCancelledProps) {
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

  return (
    <Html>
      <Head />
      <Preview>Your appointment on {formattedDate} has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Appointment Cancelled</Heading>
          <Text style={text}>Hello {patientName},</Text>
          <Text style={text}>
            We want to let you know that the following appointment has been
            cancelled:
          </Text>
          <Section style={infoBox}>
            <Text style={infoLine}>
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={infoLine}>
              <strong>Time:</strong> {formattedTime}
            </Text>
            {professionalName && (
              <Text style={infoLine}>
                <strong>Professional:</strong> {professionalName}
              </Text>
            )}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Please contact us if you would like to schedule a new appointment.
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
