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
  ticketTitle: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
  },
  confirmationCode: {
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
  footer: {
    marginTop: 32,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});
