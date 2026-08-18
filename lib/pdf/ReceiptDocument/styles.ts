import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  clubName: {
    fontSize: 16,
    fontWeight: 700,
  },
  clubEmail: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: {
    color: "#6b7280",
  },
  value: {
    fontWeight: 500,
  },
  table: {
    marginTop: 4,
    borderTop: "1px solid #e5e7eb",
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "1px solid #e5e7eb",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "1px solid #f3f4f6",
  },
  colDescription: {
    flex: 3,
  },
  colQuantity: {
    flex: 1,
    textAlign: "right",
  },
  colUnitPrice: {
    flex: 1,
    textAlign: "right",
  },
  colTotal: {
    flex: 1,
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  totalsBlock: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #1a1a1a",
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 700,
  },
  footer: {
    marginTop: 32,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});
