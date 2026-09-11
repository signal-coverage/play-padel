// @vitest-environment jsdom
import { useEffect } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useForm } from "react-hook-form";
import { useCountryProvinceCityFields } from "./CountryProvinceCityFields";
import type { CountryProvinceCityFieldsValues } from "./types";

afterEach(() => cleanup());

// Mirrors ClubSettingsView.tsx's own re-seed idiom: the form mounts with
// empty defaults (before the club query resolves), then country, province,
// and city are all reset() together in one call once the fetched data
// arrives.
function TestHost({ seed }: { seed: CountryProvinceCityFieldsValues | null }) {
  const {
    control,
    reset,
    formState: { errors },
  } = useForm<CountryProvinceCityFieldsValues>({
    defaultValues: { country: "", province: "", city: "" },
  });
  const { countryField, provinceField, cityField } =
    useCountryProvinceCityFields({ control, errors });

  useEffect(() => {
    if (seed) reset(seed);
  }, [seed, reset]);

  return (
    <>
      {countryField}
      {provinceField}
      {cityField}
    </>
  );
}

describe("useCountryProvinceCityFields", () => {
  it("keeps province and city populated when country, province, and city are reset() together after an async data fetch", async () => {
    const { rerender } = render(<TestHost seed={null} />);

    rerender(
      <TestHost
        seed={{
          country: "Argentina",
          province: "Buenos Aires",
          city: "Buenos Aires",
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /^country/i }),
      ).toHaveTextContent("Argentina");
    });

    // This is the actual bug: an effect meant only for a genuinely external,
    // country-ONLY change (e.g. PhoneField's calling-code picker) used to
    // also fire here and unconditionally clear province/city, even though
    // reset() had just set them to real, correct values in the same update.
    expect(
      screen.getByRole("combobox", { name: /province/i }),
    ).toHaveTextContent("Buenos Aires");
    expect(screen.getByRole("combobox", { name: /^city/i })).toHaveTextContent(
      "Buenos Aires",
    );
  });

  it("still clears province and city when the country genuinely changes from an external source (e.g. PhoneField's calling-code picker)", async () => {
    const { rerender } = render(
      <TestHost
        seed={{
          country: "Argentina",
          province: "Buenos Aires",
          city: "Buenos Aires",
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /province/i }),
      ).toHaveTextContent("Buenos Aires");
    });

    rerender(
      <TestHost seed={{ country: "Uruguay", province: "", city: "" }} />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /^country/i }),
      ).toHaveTextContent("Uruguay");
    });
    expect(
      screen.getByRole("combobox", { name: /province/i }),
    ).toHaveTextContent("Select a province");
    expect(screen.getByRole("combobox", { name: /^city/i })).toHaveTextContent(
      "Select a province first",
    );
  });
});
