import { describe, it, expect } from "vitest";
import { formValuesToPatchInput, playerToFormValues } from "./utils";
import type { PlayerListItem } from "../../types";
import type { PlayerEditFormValues } from "./types";

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

describe("playerToFormValues", () => {
  it("maps a player's current values onto the form's string-based shape", () => {
    expect(playerToFormValues(PLAYER)).toEqual({
      displayName: "Juan Perez",
      email: "juan@example.com",
      phone: "+541100000000",
      padelCategory: "3",
      preferredSide: "forehand",
      dominantHand: "right",
    });
  });

  it("maps null padelCategory/preferredSide/dominantHand/phone to their sentinel/empty defaults", () => {
    const player: PlayerListItem = {
      ...PLAYER,
      padelCategory: null,
      preferredSide: null,
      dominantHand: null,
      phone: null,
    };

    expect(playerToFormValues(player)).toEqual({
      displayName: "Juan Perez",
      email: "juan@example.com",
      phone: "",
      padelCategory: "unknown",
      preferredSide: "unset",
      dominantHand: "unset",
    });
  });

  it("returns blank/sentinel defaults when there is no player yet", () => {
    expect(playerToFormValues(null)).toEqual({
      displayName: "",
      email: "",
      phone: "",
      padelCategory: "unknown",
      preferredSide: "unset",
      dominantHand: "unset",
    });
  });
});

describe("formValuesToPatchInput", () => {
  const BASE_VALUES: PlayerEditFormValues = {
    displayName: "Juan Perez",
    email: "juan@example.com",
    phone: "+541100000000",
    padelCategory: "3",
    preferredSide: "forehand",
    dominantHand: "right",
  };

  it("converts real string enum values to their typed equivalents", () => {
    expect(formValuesToPatchInput(BASE_VALUES)).toEqual({
      displayName: "Juan Perez",
      email: "juan@example.com",
      phone: "+541100000000",
      padelCategory: 3,
      preferredSide: "forehand",
      dominantHand: "right",
    });
  });

  it("converts sentinel/blank values back to null", () => {
    expect(
      formValuesToPatchInput({
        ...BASE_VALUES,
        phone: "",
        padelCategory: "unknown",
        preferredSide: "unset",
        dominantHand: "unset",
      }),
    ).toEqual({
      displayName: "Juan Perez",
      email: "juan@example.com",
      phone: null,
      padelCategory: null,
      preferredSide: null,
      dominantHand: null,
    });
  });

  it("trims whitespace-only phone input to null", () => {
    expect(
      formValuesToPatchInput({ ...BASE_VALUES, phone: "   " }).phone,
    ).toBeNull();
  });
});
