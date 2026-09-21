// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useForm } from "react-hook-form";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { CategoryFieldsArray } from "./CategoryFieldsArray";
import { DEFAULT_VALUES } from "../../consts";
import type { CreateTournamentFormValues } from "../../types";

afterEach(cleanup);

function Harness() {
  const { control, register, formState } = useForm<CreateTournamentFormValues>({
    defaultValues: DEFAULT_VALUES,
  });
  return (
    <CategoryFieldsArray
      control={control}
      register={register}
      errors={formState.errors.categories}
    />
  );
}

function renderHarness() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <Harness />
    </NextIntlClientProvider>,
  );
}

describe("CategoryFieldsArray", () => {
  it("renders exactly one category row by default", () => {
    renderHarness();
    expect(screen.getAllByLabelText(/nombre de la categoría/i)).toHaveLength(1);
  });

  it("adds a new category row when clicking Agregar categoría", () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: /agregar categoría/i }));

    expect(screen.getAllByLabelText(/nombre de la categoría/i)).toHaveLength(2);
  });

  it("removes a category row when clicking its remove button", () => {
    renderHarness();
    fireEvent.click(screen.getByRole("button", { name: /agregar categoría/i }));
    expect(screen.getAllByLabelText(/nombre de la categoría/i)).toHaveLength(2);

    const removeButtons = screen.getAllByRole("button", {
      name: /quitar categoría/i,
    });
    fireEvent.click(removeButtons[0]);

    expect(screen.getAllByLabelText(/nombre de la categoría/i)).toHaveLength(1);
  });

  it("disables the remove button when only one category remains", () => {
    renderHarness();

    const removeButton = screen.getByRole("button", {
      name: /quitar categoría/i,
    });
    expect(removeButton).toBeDisabled();
  });
});
