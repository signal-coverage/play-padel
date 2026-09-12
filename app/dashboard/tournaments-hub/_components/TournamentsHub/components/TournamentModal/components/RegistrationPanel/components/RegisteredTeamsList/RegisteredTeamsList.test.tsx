// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RegisteredTeamsList } from "./RegisteredTeamsList";

afterEach(cleanup);

describe("RegisteredTeamsList", () => {
  it("shows a loading state", () => {
    render(<RegisteredTeamsList teams={[]} isLoading />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an empty state when nothing is registered yet", () => {
    render(<RegisteredTeamsList teams={[]} isLoading={false} />);

    expect(screen.getByText(/no teams registered/i)).toBeInTheDocument();
  });

  it("lists each team as player1 / player2", () => {
    render(
      <RegisteredTeamsList
        teams={[
          {
            id: "team_1",
            player1DisplayName: "Ana Gómez",
            player2DisplayName: "Bruno Díaz",
          },
          {
            id: "team_2",
            player1DisplayName: "Carla Ruiz",
            player2DisplayName: "Diego Paz",
          },
        ]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Ana Gómez / Bruno Díaz")).toBeInTheDocument();
    expect(screen.getByText("Carla Ruiz / Diego Paz")).toBeInTheDocument();
  });
});
