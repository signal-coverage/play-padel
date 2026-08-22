"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatPriceDisplay, parsePriceInput } from "./utils";
import type { CurrencyAmountFieldProps } from "./types";

// ARS-only for now (see lib/utils/currency.ts's formatCourtPrice, which
// makes the same simplification for the read-only display side). No
// required/invalid styling of its own beyond the optional ariaInvalid pass-
// through — a court price is optional, a reservation fee is required, and
// that distinction is enforced by the caller's Zod schema, not this field.
export function CurrencyAmountField({
  id,
  value,
  onChange,
  ariaInvalid,
}: CurrencyAmountFieldProps) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>ARS</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="5.000"
        value={formatPriceDisplay(value)}
        onChange={(event) => onChange(parsePriceInput(event.target.value))}
        aria-invalid={ariaInvalid}
      />
    </InputGroup>
  );
}
