import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatPriceDisplay, parsePriceInput } from "./utils";
import type { CourtPriceFieldProps } from "./types";

// Optional (unlike ReservationFeeField): a court without a courtPrice is
// valid, so this never surfaces a required/invalid state.
export function CourtPriceField({ id, value, onChange }: CourtPriceFieldProps) {
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
      />
    </InputGroup>
  );
}
