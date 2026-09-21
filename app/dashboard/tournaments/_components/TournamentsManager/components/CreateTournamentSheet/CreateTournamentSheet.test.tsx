// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { CreateTournamentSheet } from "./CreateTournamentSheet";

afterEach(cleanup);

function renderSheet(
  props: Partial<React.ComponentProps<typeof CreateTournamentSheet>> = {},
) {
  const defaultProps: React.ComponentProps<typeof CreateTournamentSheet> = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
  };
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CreateTournamentSheet {...defaultProps} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("CreateTournamentSheet", () => {
  it("keeps the create button disabled until the required fields are valid", async () => {
    renderSheet();

    expect(
      screen.getByRole("button", { name: /crear torneo/i }),
    ).toBeDisabled();
  });

  it("submits with the filled values converted into the API's shape", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderSheet({ onSubmit });

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: "Summer Open" },
    });
    fireEvent.change(screen.getByLabelText(/apertura de inscripción/i), {
      target: { value: "2026-10-01T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/cierre de inscripción/i), {
      target: { value: "2026-10-10T10:00" },
    });
    fireEvent.change(screen.getByLabelText(/nombre de la categoría/i), {
      target: { value: "Cuarta" },
    });
    fireEvent.change(screen.getByLabelText(/cantidad de grupos/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/clasificados por grupo/i), {
      target: { value: "1" },
    });

    const createButton = await screen.findByRole("button", {
      name: /crear torneo/i,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(createButton).not.toBeDisabled();

    fireEvent.click(createButton);

    await screen.findByRole("button", { name: /crear torneo/i });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Summer Open",
        registrationOpensAt: new Date("2026-10-01T10:00").toISOString(),
        registrationClosesAt: new Date("2026-10-10T10:00").toISOString(),
        categories: [
          expect.objectContaining({
            name: "Cuarta",
            groupCount: 2,
            advancesPerGroup: 1,
          }),
        ],
      }),
    );
  });

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    const onOpenChange = vi.fn();
    renderSheet({ onOpenChange });

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a creating state and disables the submit button while isSubmitting", () => {
    renderSheet({ isSubmitting: true });

    expect(screen.getByRole("button", { name: /creando/i })).toBeDisabled();
  });
});
