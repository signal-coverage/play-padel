// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { TournamentsList } from "./TournamentsList";

afterEach(cleanup);

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

function renderList(
  props: Partial<React.ComponentProps<typeof TournamentsList>> = {},
  fetchMock: ReturnType<typeof vi.fn> = vi.fn(),
) {
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const defaultProps: React.ComponentProps<typeof TournamentsList> = {
    tournaments: [],
    selectedTournamentId: null,
    onSelect: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <TournamentsList {...defaultProps} {...props} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("TournamentsList", () => {
  it("shows an empty state with no tournaments", () => {
    renderList();
    expect(screen.getByText(/todavía no hay torneos/i)).toBeInTheDocument();
  });

  it("calls onSelect with the clicked tournament's id", () => {
    const onSelect = vi.fn();
    renderList({
      tournaments: [
        { id: "t1", name: "Summer Open", status: "DRAFT" },
        { id: "t2", name: "Winter Cup", status: "REGISTRATION_OPEN" },
      ],
      onSelect,
    });

    fireEvent.click(screen.getByRole("button", { name: /winter cup/i }));

    expect(onSelect).toHaveBeenCalledWith("t2");
  });

  it("shows a Crear torneo button that opens the create sheet", () => {
    renderList();

    expect(
      screen.queryByRole("heading", { name: /crear torneo/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /crear torneo/i }));

    expect(
      screen.getByRole("heading", { name: /crear torneo/i }),
    ).toBeInTheDocument();
  });

  it("creates a tournament via the API and closes the sheet on success", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/clubs/tournaments" && init?.method === "POST") {
        return jsonResponse({
          tournament: { id: "new_t", name: "Summer Open", status: "DRAFT" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    renderList({}, fetchMock);

    fireEvent.click(screen.getByRole("button", { name: /crear torneo/i }));

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

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /crear torneo/i }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /crear torneo/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/clubs/tournaments",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Torneo creado"),
    );
    expect(
      screen.queryByRole("heading", { name: /crear torneo/i }),
    ).not.toBeInTheDocument();
  });

  it("publishes a DRAFT tournament when Publicar is clicked", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (
        url === "/api/clubs/tournaments/t1/publish" &&
        init?.method === "POST"
      ) {
        return jsonResponse({
          tournament: {
            id: "t1",
            name: "Summer Open",
            status: "REGISTRATION_OPEN",
          },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    renderList(
      {
        tournaments: [{ id: "t1", name: "Summer Open", status: "DRAFT" }],
      },
      fetchMock,
    );

    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/clubs/tournaments/t1/publish",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Torneo publicado"),
    );
  });

  it("routes creation through the admin-scoped endpoint when clubId is provided", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (
        url === "/api/admin/clubs/club_1/tournaments" &&
        init?.method === "POST"
      ) {
        return jsonResponse({
          tournament: { id: "new_t", name: "Summer Open", status: "DRAFT" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    renderList({ clubId: "club_1" }, fetchMock);

    fireEvent.click(screen.getByRole("button", { name: /crear torneo/i }));

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

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /crear torneo/i }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /crear torneo/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/clubs/club_1/tournaments",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("routes publish through the admin-scoped endpoint when clubId is provided", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (
        url === "/api/admin/clubs/club_1/tournaments/t1/publish" &&
        init?.method === "POST"
      ) {
        return jsonResponse({
          tournament: {
            id: "t1",
            name: "Summer Open",
            status: "REGISTRATION_OPEN",
          },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    renderList(
      {
        clubId: "club_1",
        tournaments: [{ id: "t1", name: "Summer Open", status: "DRAFT" }],
      },
      fetchMock,
    );

    fireEvent.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/clubs/club_1/tournaments/t1/publish",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});
