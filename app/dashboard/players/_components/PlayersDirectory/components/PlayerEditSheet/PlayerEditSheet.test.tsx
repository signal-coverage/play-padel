// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PlayerEditSheet } from "./PlayerEditSheet";
import type { PlayerListItem } from "../../types";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const PLAYER: PlayerListItem = {
  id: "player_1",
  displayName: "Juan Perez",
  avatarUrl: null,
  padelCategory: 3,
  preferredSide: "forehand",
  dominantHand: "right",
  email: "juan@example.com",
  phone: "+541100000000",
};

function renderSheet(
  overrides: Partial<React.ComponentProps<typeof PlayerEditSheet>> = {},
) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const onOpenChange = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);

  render(
    <PlayerEditSheet
      open
      onOpenChange={onOpenChange}
      player={PLAYER}
      onSubmit={onSubmit}
      isSubmitting={false}
      {...overrides}
    />,
  );

  return { onOpenChange, onSubmit };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlayerEditSheet", () => {
  it("pre-fills the form with the player's current data", () => {
    renderSheet();

    expect(screen.getByLabelText(/name/i)).toHaveValue("Juan Perez");
    expect(screen.getByLabelText(/email/i)).toHaveValue("juan@example.com");
    expect(screen.getByLabelText(/phone/i)).toHaveValue("+541100000000");
  });

  it("submits the converted patch input for the edited player", async () => {
    const { onSubmit, onOpenChange } = renderSheet();

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Juan Updated" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "Juan Updated",
          email: "juan@example.com",
          phone: "+541100000000",
          padelCategory: 3,
          preferredSide: "forehand",
          dominantHand: "right",
        }),
      );
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("keeps the sheet open when onSubmit rejects, so the admin can retry", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("failed"));
    const onOpenChange = vi.fn();

    renderSheet({ onSubmit, onOpenChange });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
