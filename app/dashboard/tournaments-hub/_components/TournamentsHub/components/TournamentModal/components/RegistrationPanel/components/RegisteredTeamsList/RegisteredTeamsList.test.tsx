// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { RegisteredTeamsList } from "./RegisteredTeamsList";

afterEach(cleanup);

function renderList(props: React.ComponentProps<typeof RegisteredTeamsList>) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <RegisteredTeamsList {...props} />
    </NextIntlClientProvider>,
  );
}

describe("RegisteredTeamsList", () => {
  it("shows a loading state", () => {
    renderList({ teams: [], isLoading: true });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an empty state when nothing is registered yet", () => {
    renderList({ teams: [], isLoading: false });

    expect(screen.getByText(/no teams registered/i)).toBeInTheDocument();
  });

  it("lists each team as player1 / player2", () => {
    renderList({
      teams: [
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
      ],
      isLoading: false,
    });

    expect(screen.getByText("Ana Gómez / Bruno Díaz")).toBeInTheDocument();
    expect(screen.getByText("Carla Ruiz / Diego Paz")).toBeInTheDocument();
  });
});
