import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import {
  formatCurrency,
  formatDate,
  formatDateTimeRange,
  formatPaymentMethod,
} from "./utils";
import type { ReceiptDocumentProps } from "./types";

// Deliberately simple: this is a payment receipt, not a marketing document.
// One page, no branding beyond the club name/email already on file.
export function ReceiptDocument({ data }: ReceiptDocumentProps) {
  return (
    <Document title={`Receipt ${data.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.clubName}>{data.clubName}</Text>
            <Text style={styles.clubEmail}>{data.clubEmail}</Text>
          </View>
          <View>
            <Text style={styles.receiptTitle}>Receipt</Text>
            <Text style={styles.invoiceNumber}>
              Invoice #{data.invoiceNumber}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reservation</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Billed to</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colDescription, styles.tableHeaderText]}>
                Description
              </Text>
              <Text style={[styles.colQuantity, styles.tableHeaderText]}>
                Qty
              </Text>
              <Text style={[styles.colUnitPrice, styles.tableHeaderText]}>
                Unit price
              </Text>
              <Text style={[styles.colTotal, styles.tableHeaderText]}>
                Total
              </Text>
            </View>
            {data.items.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={styles.colDescription}>{item.description}</Text>
                <Text style={styles.colQuantity}>{item.quantity}</Text>
                <Text style={styles.colUnitPrice}>
                  {formatCurrency(item.unitPrice, data.currency)}
                </Text>
                <Text style={styles.colTotal}>
                  {formatCurrency(item.total, data.currency)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>
                {formatCurrency(data.subtotal, data.currency)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.label}>Tax</Text>
              <Text style={styles.value}>
                {formatCurrency(data.tax, data.currency)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.label}>Discount</Text>
              <Text style={styles.value}>
                -{formatCurrency(data.discount, data.currency)}
              </Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(data.total, data.currency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          {data.payments.map((payment, index) => (
            <View key={index}>
              <View style={styles.row}>
                <Text style={styles.label}>Method</Text>
                <Text style={styles.value}>
                  {formatPaymentMethod(payment.method)}
                </Text>
              </View>
              {payment.reference && (
                <View style={styles.row}>
                  <Text style={styles.label}>Reference</Text>
                  <Text style={styles.value}>{payment.reference}</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={styles.label}>Amount paid</Text>
                <Text style={styles.value}>
                  {formatCurrency(payment.amount, data.currency)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Paid on</Text>
                <Text style={styles.value}>{formatDate(payment.date)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          This receipt was generated automatically and is valid without a
          signature.
        </Text>
      </Page>
    </Document>
  );
}
