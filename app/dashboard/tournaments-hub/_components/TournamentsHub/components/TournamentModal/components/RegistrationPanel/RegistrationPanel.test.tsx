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

const registerTeamMock = { mutate: vi.fn(), isPending: false };
const withdrawTeamMock = { mutate: vi.fn(), isPending: false };
const useCategoryTeamsMock = vi.fn();

vi.mock("./hooks", () => ({
  useCategoryTeams: (...args: unknown[]) => useCategoryTeamsMock(...args),
  useRegisterTeam: () => registerTeamMock,
  useWithdrawTeam: () => withdrawTeamMock,
}));

vi.mock("@/components/PlayerPicker", () => ({
  PlayerPicker: ({ onChange }: { onChange: (ids: string[]) => void }) => (
    <button type="button" onClick={() => onChange(["partner_1"])}>
      Pick Bruno
    </button>
  ),
}));

import { RegistrationPanel } from "./RegistrationPanel";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ACTIVE_TEAMS = [
  {
    id: "team_1",
    player1Id: "me",
    player2Id: "partner_1",
    player1DisplayName: "Me",
    player2DisplayName: "Bruno Díaz",
    status: "REGISTERED",
  },
  {
    id: "team_2",
    player1Id: "p3",
    player2Id: "p4",
    player1DisplayName: "Carla Ruiz",
    player2DisplayName: "Diego Paz",
    status: "REGISTERED",
  },
];

describe("RegistrationPanel", () => {
  it("shows a PlayerPicker + disabled Register button when the viewer has no team yet", () => {
    useCategoryTeamsMock.mockReturnValue({ data: [], isLoading: false });

    render(
      <RegistrationPanel tournamentId="t1" categoryId="c1" viewerId="me" />,
    );

    expect(screen.getByText("Pick Bruno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^register$/i })).toBeDisabled();
  });

  it("enables Register once a partner is picked, and submits with the picked id", async () => {
    useCategoryTeamsMock.mockReturnValue({ data: [], isLoading: false });

    render(
      <RegistrationPanel tournamentId="t1" categoryId="c1" viewerId="me" />,
    );

    fireEvent.click(screen.getByText("Pick Bruno"));
    const registerButton = screen.getByRole("button", { name: /^register$/i });
    await waitFor(() => expect(registerButton).not.toBeDisabled());

    fireEvent.click(registerButton);

    expect(registerTeamMock.mutate).toHaveBeenCalledWith(
      "partner_1",
      expect.anything(),
    );
  });

  it("shows the viewer's own registration status and a Withdraw button when already registered", () => {
    useCategoryTeamsMock.mockReturnValue({
      data: ACTIVE_TEAMS,
      isLoading: false,
    });

    render(
      <RegistrationPanel tournamentId="t1" categoryId="c1" viewerId="me" />,
    );

    expect(screen.getByText(/you're registered with/i)).toBeInTheDocument();
    expect(screen.getAllByText(/bruno díaz/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /withdraw/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Pick Bruno")).not.toBeInTheDocument();
  });

  it("calls withdrawTeam with the viewer's own team id", () => {
    useCategoryTeamsMock.mockReturnValue({
      data: ACTIVE_TEAMS,
      isLoading: false,
    });

    render(
      <RegistrationPanel tournamentId="t1" categoryId="c1" viewerId="me" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /withdraw/i }));

    expect(withdrawTeamMock.mutate).toHaveBeenCalledWith("team_1");
  });

  it("lists every active registered team", () => {
    useCategoryTeamsMock.mockReturnValue({
      data: ACTIVE_TEAMS,
      isLoading: false,
    });

    render(
      <RegistrationPanel tournamentId="t1" categoryId="c1" viewerId="me" />,
    );

    expect(screen.getByText("Carla Ruiz / Diego Paz")).toBeInTheDocument();
  });

  it("excludes withdrawn teams from both the roster and the registration-status check", () => {
    useCategoryTeamsMock.mockReturnValue({
      data: [{ ...ACTIVE_TEAMS[0], status: "WITHDRAWN" }],
      isLoading: false,
    });

    render(
      <RegistrationPanel tournamentId="t1" categoryId="c1" viewerId="me" />,
    );

    expect(screen.getByText("Pick Bruno")).toBeInTheDocument();
    expect(screen.queryByText(/bruno díaz/i)).not.toBeInTheDocument();
  });
});
