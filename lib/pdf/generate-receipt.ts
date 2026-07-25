import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceReceiptData } from "@/core/billing/types";

// Re-export the type so callers can import from a single location.
export type { InvoiceReceiptData };

type JsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateReceiptPdf(invoice: InvoiceReceiptData): Blob {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as JsPDFWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ── Header ───────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.clubName, margin, 25);

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("RECEIPT", pageWidth - margin, 25, { align: "right" });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 32, pageWidth - margin, 32);

  // ── Invoice metadata ─────────────────────────────────────────────────
  let y = 42;
  const col1 = margin;
  const col2 = margin + contentWidth / 3;
  const col3 = margin + (contentWidth * 2) / 3;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text("Invoice Number", col1, y);
  doc.text("Date Issued", col2, y);
  doc.text("Status", col3, y);

  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(`#${invoice.invoiceNumber}`, col1, y);
  doc.text(formatDate(invoice.issuedAt ?? invoice.createdAt), col2, y);
  doc.text(invoice.status, col3, y);

  // ── User info ────────────────────────────────────────────────────────
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text("Bill To", margin, y);

  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(invoice.userName, margin, y);

  // ── Items table ──────────────────────────────────────────────────────
  y += 14;

  const itemRows = invoice.items.map((item) => [
    item.description,
    String(item.quantity),
    formatAmount(item.unitPrice, invoice.currency),
    formatAmount(item.total, invoice.currency),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: itemRows,
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 38, halign: "right" },
      3: { cellWidth: 38, halign: "right" },
    },
  });

  // ── Payments table ───────────────────────────────────────────────────
  if (invoice.payments.length > 0) {
    const paymentRows = invoice.payments.map((p) => [
      formatDate(p.date),
      p.method,
      formatAmount(p.amount, invoice.currency),
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      margin: { left: margin, right: margin },
      head: [["Payment Date", "Method", "Amount"]],
      body: paymentRows,
      headStyles: {
        fillColor: [80, 80, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 40 },
        2: { cellWidth: 38, halign: "right" },
      },
    });
  }

  // ── Totals section ───────────────────────────────────────────────────
  let totalsY = doc.lastAutoTable.finalY + 14;
  const labelX = pageWidth - margin - 70;
  const valueX = pageWidth - margin;

  doc.setFontSize(10);

  if (
    invoice.subtotal !== invoice.total ||
    invoice.tax !== 0 ||
    invoice.discount !== 0
  ) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Subtotal", labelX, totalsY);
    doc.text(
      formatAmount(invoice.subtotal, invoice.currency),
      valueX,
      totalsY,
      {
        align: "right",
      },
    );

    if (invoice.tax !== 0) {
      totalsY += 7;
      doc.text("Tax", labelX, totalsY);
      doc.text(formatAmount(invoice.tax, invoice.currency), valueX, totalsY, {
        align: "right",
      });
    }

    if (invoice.discount !== 0) {
      totalsY += 7;
      doc.text("Discount", labelX, totalsY);
      doc.text(
        `-${formatAmount(invoice.discount, invoice.currency)}`,
        valueX,
        totalsY,
        { align: "right" },
      );
    }

    totalsY += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(labelX, totalsY, valueX, totalsY);
    totalsY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(12);
  doc.text("Total", labelX, totalsY);
  doc.text(formatAmount(invoice.total, invoice.currency), valueX, totalsY, {
    align: "right",
  });

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid > 0) {
    totalsY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Paid", labelX, totalsY);
    doc.text(formatAmount(totalPaid, invoice.currency), valueX, totalsY, {
      align: "right",
    });

    const balance = Math.round((invoice.total - totalPaid) * 100) / 100;
    if (balance !== 0) {
      totalsY += 7;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(balance > 0 ? 180 : 30, 30, 30);
      doc.text("Balance Due", labelX, totalsY);
      doc.text(formatAmount(balance, invoice.currency), valueX, totalsY, {
        align: "right",
      });
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text("Thank you for your payment.", pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  if (invoice.clubEmail) {
    doc.text(invoice.clubEmail, pageWidth / 2, pageHeight - 13, {
      align: "center",
    });
  }

  return doc.output("blob");
}
