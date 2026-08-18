import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatPriceDisplay, parsePriceInput } from "./utils";
import type { ReservationFeeFieldProps } from "./types";

export function ReservationFeeField({
  id,
  value,
  onChange,
  ariaInvalid,
}: ReservationFeeFieldProps) {
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
