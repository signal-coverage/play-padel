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

interface BankTransferHoldExpiredProps {
  userName: string;
  courtName: string;
  scheduledStart: Date;
}

export function BankTransferHoldExpired({
  userName,
  courtName,
  scheduledStart,
}: BankTransferHoldExpiredProps) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(scheduledStart);

  return (
    <Html>
      <Head />
      <Preview>Your reservation hold has expired</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your reservation hold expired</Heading>
          <Text style={text}>Hello {userName},</Text>
          <Text style={text}>
            Your bank-transfer payment for {courtName} on {formattedDate} was
            not confirmed in time, so your slot was released.
          </Text>
          <Section style={infoBox}>
            <Text style={infoLine}>
              Please book again if you&apos;d still like this slot — it may have
              been taken by another player in the meantime.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            If you already sent your transfer, contact the club directly to
            confirm before booking again.
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
