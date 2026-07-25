import type { InvoiceFilters } from "@/core/billing/types";

export interface InvoiceFiltersProps {
  filters: InvoiceFilters;
  onFiltersChange: (filters: InvoiceFilters) => void;
}
