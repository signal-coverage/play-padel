// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useForm } from "react-hook-form";
import type { Path } from "react-hook-form";
import { PhoneField } from "./PhoneField";
import type { PhoneFieldValues } from "./types";

// Extends the base phone/country shape with a second phone-like pair so
// tests can exercise a custom phoneFieldName/countryFieldName instance
// (e.g. the WhatsApp field Tasks 7/8 add) alongside the default one.
type HarnessValues = PhoneFieldValues & {
  whatsappNumber: string;
  whatsappCountry: string;
};

type HarnessOverrides = {
  phoneFieldName?: Path<HarnessValues>;
  countryFieldName?: Path<HarnessValues>;
  label?: string;
};

function Harness({
  phoneFieldName,
  countryFieldName,
  label,
}: HarnessOverrides = {}) {
  const {
    control,
    formState: { errors },
  } = useForm<HarnessValues>({
    defaultValues: {
      phone: "",
      country: "",
      whatsappNumber: "",
      whatsappCountry: "",
    },
  });
  return (
    <PhoneField
      control={control}
      errors={errors}
      phoneFieldName={phoneFieldName}
      countryFieldName={countryFieldName}
      label={label}
    />
  );
}

function renderPhoneField(overrides: HarnessOverrides = {}) {
  return render(<Harness {...overrides} />);
}

describe("PhoneField", () => {
  afterEach(() => {
    cleanup();
  });

  // Regression: below the `lg` breakpoint the wrapping div is `flex-col`, so
  // its main axis is vertical. An unscoped `flex-1` (flex-basis: 0%) on the
  // number input then overrides the explicit `h-8` on that same axis,
  // silently shrinking the input's height below the shared 32px row height
  // used everywhere else — only at `lg` and up (where the axis flips to
  // horizontal, via `lg:flex-row`) does `h-8` win. Scoping flex-1 to `lg:`
  // keeps it out of the way below that breakpoint.
  it("keeps flex-1 scoped to the lg breakpoint so it never overrides h-8 on the stacked (mobile) layout", () => {
    const { container } = renderPhoneField();
    const input = container.querySelector("#phone-rest") as HTMLInputElement;
    const classes = input.className.split(/\s+/);

    expect(classes).not.toContain("flex-1");
    expect(classes).toContain("lg:flex-1");
  });

  it("renders with the default label and binds to the 'phone'/'country' fields when no overrides are passed", () => {
    const { getByText } = renderPhoneField();
    expect(getByText("Phone *")).toBeInTheDocument();
  });

  it("renders with a custom label and writes to custom field names when phoneFieldName/countryFieldName/label are provided", () => {
    const { getByText, getByLabelText } = renderPhoneField({
      phoneFieldName: "whatsappNumber",
      countryFieldName: "whatsappCountry",
      label: "WhatsApp (for payment receipts) *",
    });
    expect(getByText("WhatsApp (for payment receipts) *")).toBeInTheDocument();
    // The rest-of-number input's id is derived from phoneFieldName, so two
    // instances on the same form never collide on id="phone-rest" twice.
    expect(getByLabelText("WhatsApp (for payment receipts) *")).toHaveAttribute(
      "id",
      "whatsappNumber-rest",
    );
  });
});
