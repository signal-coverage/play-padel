"use client";

import { useState } from "react";
import { DownloadIcon, LoaderIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getInvoiceForReceipt } from "@/app/actions/billing";

interface DownloadReceiptButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export function DownloadReceiptButton({
  invoiceId,
  invoiceNumber,
}: DownloadReceiptButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleDownload() {
    setIsLoading(true);
    try {
      const result = await getInvoiceForReceipt(invoiceId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to load receipt data");
        return;
      }

      // Dynamic import keeps jsPDF out of the server bundle entirely.
      const { generateReceiptPdf } = await import("@/lib/pdf/generate-receipt");
      const blob = generateReceiptPdf(result.data);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate receipt");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDownload}
      disabled={isLoading}
      aria-label="Download receipt"
    >
      {isLoading ? (
        <LoaderIcon className="h-4 w-4 animate-spin" />
      ) : (
        <DownloadIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
