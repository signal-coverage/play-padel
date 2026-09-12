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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PartnerPicker } from "./PartnerPicker";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PLAYERS = [
  { id: "p1", displayName: "Ana Gómez", avatarUrl: null },
  { id: "p2", displayName: "Bruno Díaz", avatarUrl: null },
  { id: "p3", displayName: "Carla Ruiz", avatarUrl: null },
  { id: "p4", displayName: "Diego Paz", avatarUrl: null },
];

function renderPicker(
  overrides: Partial<React.ComponentProps<typeof PartnerPicker>> = {},
) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ players: PLAYERS }),
    }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <PartnerPicker
        selectedIds={[]}
        onChange={onChange}
        excludeUserId="me"
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { onChange };
}

describe("PartnerPicker", () => {
  it("lists fetched players once loaded", async () => {
    renderPicker();

    await waitFor(() =>
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument(),
    );
    expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();
  });

  it("filters the list as the user types in the search box", async () => {
    renderPicker();
    await waitFor(() =>
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "bruno" },
    });

    expect(screen.queryByText("Ana Gómez")).not.toBeInTheDocument();
    expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();
  });

  it("calls onChange with the added id when a player is selected", async () => {
    const { onChange } = renderPicker();
    await waitFor(() =>
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Ana Gómez"));

    expect(onChange).toHaveBeenCalledWith(["p1"]);
  });

  it("calls onChange with the id removed when an already-selected player is clicked again", async () => {
    const { onChange } = renderPicker({ selectedIds: ["p1"] });
    await waitFor(() =>
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Ana Gómez"));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("disables selecting a new player once 3 are already selected", async () => {
    const { onChange } = renderPicker({ selectedIds: ["p1", "p2", "p3"] });
    await waitFor(() =>
      expect(screen.getByText("Diego Paz")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Diego Paz"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("still allows deselecting one of the 3 already-selected players", async () => {
    const { onChange } = renderPicker({ selectedIds: ["p1", "p2", "p3"] });
    await waitFor(() =>
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Ana Gómez"));

    expect(onChange).toHaveBeenCalledWith(["p2", "p3"]);
  });

  it("never offers the excluded (signed-in) user as a candidate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          players: [
            ...PLAYERS,
            { id: "me", displayName: "Me", avatarUrl: null },
          ],
        }),
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PartnerPicker selectedIds={[]} onChange={vi.fn()} excludeUserId="me" />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Ana Gómez")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Me")).not.toBeInTheDocument();
  });
});
