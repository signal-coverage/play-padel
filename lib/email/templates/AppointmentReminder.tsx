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

interface AppointmentReminderProps {
  patientName: string;
  scheduledStart: Date;
  professionalName?: string;
  location?: string;
}

export function AppointmentReminder({
  patientName,
  scheduledStart,
  professionalName,
  location,
}: AppointmentReminderProps) {
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
      <Preview>Appointment reminder for {formattedDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Appointment Reminder</Heading>
          <Text style={text}>Hello {patientName},</Text>
          <Text style={text}>
            This is a reminder about your upcoming appointment:
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
            {location && (
              <Text style={infoLine}>
                <strong>Location:</strong> {location}
              </Text>
            )}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            If you need to cancel or reschedule, please contact us as soon as
            possible.
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
