import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { formatDateTimeRange, formatReservationStatus } from "./utils";
import type { TicketDocumentProps } from "./types";

// Deliberately simple: this is a booking confirmation, not a marketing
// document, and NOT an invoice — no pricing/payment section at all (that's
// what ReceiptDocument is for). Works for any CONFIRMED reservation, paid or
// free.
export function TicketDocument({ data }: TicketDocumentProps) {
  return (
    <Document title={`Ticket ${data.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.clubName}>{data.clubName}</Text>
          </View>
          <View>
            <Text style={styles.ticketTitle}>Booking Ticket</Text>
            <Text style={styles.confirmationCode}>Confirmation: {data.id}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reservation</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Player</Text>
            <Text style={styles.value}>{data.userName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Court</Text>
            <Text style={styles.value}>{data.courtName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date &amp; time</Text>
            <Text style={styles.value}>
              {formatDateTimeRange(data.scheduledStart, data.scheduledEnd)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>
              {formatReservationStatus(data.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This ticket confirms your booking and is valid without a signature.
        </Text>
      </Page>
    </Document>
  );
}
