import type { Control, FieldErrors, UseFormSetValue } from "react-hook-form";
import type { CreateInvoiceSchemaOutput } from "@/core/billing/schemas/billing.schema";

export interface InvoiceItemsEditorProps {
  control: Control<CreateInvoiceSchemaOutput>;
  errors: FieldErrors<CreateInvoiceSchemaOutput>;
  setValue?: UseFormSetValue<CreateInvoiceSchemaOutput>;
}
