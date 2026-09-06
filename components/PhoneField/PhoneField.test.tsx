// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useForm } from "react-hook-form";
import { PhoneField } from "./PhoneField";
import type { PhoneFieldValues } from "./types";

function Harness() {
  const {
    control,
    formState: { errors },
  } = useForm<PhoneFieldValues>({ defaultValues: { phone: "", country: "" } });
  return <PhoneField control={control} errors={errors} />;
}

describe("PhoneField", () => {
  // Regression: below the `lg` breakpoint the wrapping div is `flex-col`, so
  // its main axis is vertical. An unscoped `flex-1` (flex-basis: 0%) on the
  // number input then overrides the explicit `h-8` on that same axis,
  // silently shrinking the input's height below the shared 32px row height
  // used everywhere else — only at `lg` and up (where the axis flips to
  // horizontal, via `lg:flex-row`) does `h-8` win. Scoping flex-1 to `lg:`
  // keeps it out of the way below that breakpoint.
  it("keeps flex-1 scoped to the lg breakpoint so it never overrides h-8 on the stacked (mobile) layout", () => {
    const { container } = render(<Harness />);
    const input = container.querySelector("#phone-rest") as HTMLInputElement;
    const classes = input.className.split(/\s+/);

    expect(classes).not.toContain("flex-1");
    expect(classes).toContain("lg:flex-1");
  });
});
