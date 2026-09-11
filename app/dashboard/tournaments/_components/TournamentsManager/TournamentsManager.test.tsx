// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { TournamentsManager } from "./TournamentsManager";

afterEach(cleanup);

const TOURNAMENT_DETAIL = {
  id: "tourney_1",
  name: "Summer Open",
  status: "REGISTRATION_OPEN",
  categories: [
    {
      id: "cat_1",
      name: "Category A",
      status: "REGISTRATION_CLOSED",
      groupCount: 1,
      advancesPerGroup: 2,
    },
  ],
};

const TEAMS = [
  {
    id: "team_1",
    player1DisplayName: "Alice",
    player2DisplayName: "Ana",
    status: "REGISTERED",
  },
  {
    id: "team_2",
    player1DisplayName: "Bob",
    player2DisplayName: "Ben",
    status: "REGISTERED",
  },
];

function renderManager() {
  // Mutable in-memory state so a POST /groups response is reflected by the
  // next GET /groups — mirrors what real invalidate+refetch does.
  const state = {
    groups: [] as {
      id: string;
      name: string;
      position: number;
      teamIds: string[];
    }[],
  };

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";

    if (url === "/api/clubs/tournaments" && method === "GET") {
      return jsonResponse({
        tournaments: [
          { id: "tourney_1", name: "Summer Open", status: "REGISTRATION_OPEN" },
        ],
      });
    }
    if (url === "/api/clubs/tournaments/tourney_1" && method === "GET") {
      return jsonResponse({ tournament: TOURNAMENT_DETAIL });
    }
    if (url === "/api/clubs/tournaments/tourney_1/categories/cat_1/teams") {
      return jsonResponse({ teams: TEAMS });
    }
    if (
      url === "/api/clubs/tournaments/tourney_1/categories/cat_1/groups" &&
      method === "GET"
    ) {
      return jsonResponse({ groups: state.groups });
    }
    if (
      url === "/api/clubs/tournaments/tourney_1/categories/cat_1/groups" &&
      method === "POST"
    ) {
      state.groups = [
        {
          id: "group_1",
          name: "Group A",
          position: 0,
          teamIds: ["team_1", "team_2"],
        },
      ];
      return jsonResponse({ ok: true });
    }
    if (
      url ===
      "/api/clubs/tournaments/tourney_1/categories/cat_1/groups/group_1/matches"
    ) {
      return jsonResponse({
        matches: [
          {
            id: "match_1",
            teamAId: "team_1",
            teamBId: "team_2",
            status: "SCHEDULED",
          },
        ],
      });
    }
    if (
      url ===
      "/api/clubs/tournaments/tourney_1/categories/cat_1/groups/group_1/standings"
    ) {
      return jsonResponse({ standings: [] });
    }
    if (
      url ===
        "/api/clubs/tournaments/tourney_1/categories/cat_1/matches/match_1/score" &&
      method === "POST"
    ) {
      return jsonResponse({ ok: true });
    }

    throw new Error(`unexpected fetch: ${url} ${method}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TournamentsManager />
    </QueryClientProvider>,
  );

  return fetchMock;
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("TournamentsManager", () => {
  it("lets an owner pick a tournament and category, generate groups, and enter a score", async () => {
    renderManager();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /summer open/i }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /summer open/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /category a/i }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /category a/i }));

    // Wait for the teams roster to load too — otherwise the "generate"
    // button is still disabled (teams.length === 0) and the click no-ops.
    await waitFor(() =>
      expect(screen.getByText("Alice / Ana")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /generate groups automatically/i }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /generate groups automatically/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /enter score/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /enter score/i }));

    const teamAInputs = screen.getAllByLabelText("Team A games");
    const teamBInputs = screen.getAllByLabelText("Team B games");
    fireEvent.change(teamAInputs[0], { target: { value: "6" } });
    fireEvent.change(teamBInputs[0], { target: { value: "4" } });
    fireEvent.change(teamAInputs[1], { target: { value: "6" } });
    fireEvent.change(teamBInputs[1], { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /save score/i }));

    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Score entered"),
    );
  });
});
