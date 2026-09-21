// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { WalkoverDialog } from "./WalkoverDialog";

afterEach(cleanup);

function renderDialog(props: React.ComponentProps<typeof WalkoverDialog>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <WalkoverDialog {...props} />
    </NextIntlClientProvider>,
  );
}

describe("WalkoverDialog", () => {
  it("calls onConfirm with team A's id when Team A wins is clicked", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      teamAId: "team_a",
      teamALabel: "Alice / Ana",
      teamBId: "team_b",
      teamBLabel: "Bob / Ben",
      onConfirm,
      isSubmitting: false,
    });

    fireEvent.click(screen.getByRole("button", { name: /gana alice \/ ana/i }));

    expect(onConfirm).toHaveBeenCalledWith("team_a");
  });

  it("calls onConfirm with team B's id when Team B wins is clicked", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      teamAId: "team_a",
      teamALabel: "Alice / Ana",
      teamBId: "team_b",
      teamBLabel: "Bob / Ben",
      onConfirm,
      isSubmitting: false,
    });

    fireEvent.click(screen.getByRole("button", { name: /gana bob \/ ben/i }));

    expect(onConfirm).toHaveBeenCalledWith("team_b");
  });
});
