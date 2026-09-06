import type { PlayerListItem, PlayerPatchInput } from "../../types";
import type { PlayerEditFormValues } from "./types";

/**
 * Seeds the form's default values from the player currently being edited
 * (or blank/sentinel defaults when there is none yet, e.g. before the sheet
 * has ever opened). Mirrors the "unknown"/null convention the onboarding
 * form already uses for padelCategory (see app/onboarding/types.ts), plus a
 * matching "unset" sentinel for preferredSide/dominantHand — Radix Select
 * can't represent an unselected value as an empty string.
 */
export function playerToFormValues(
  player: PlayerListItem | null,
): PlayerEditFormValues {
  return {
    displayName: player?.displayName ?? "",
    email: player?.email ?? "",
    phone: player?.phone ?? "",
    padelCategory:
      player?.padelCategory != null ? String(player.padelCategory) : "unknown",
    preferredSide: player?.preferredSide ?? "unset",
    dominantHand: player?.dominantHand ?? "unset",
  };
}

/**
 * Converts the form's string-based values back into the real typed
 * PlayerPatchInput sent to PATCH /api/admin/players/[userId] — the inverse
 * of playerToFormValues's sentinel/string mapping above.
 */
export function formValuesToPatchInput(
  values: PlayerEditFormValues,
): PlayerPatchInput {
  const trimmedPhone = values.phone.trim();
  return {
    displayName: values.displayName,
    email: values.email,
    phone: trimmedPhone ? trimmedPhone : null,
    padelCategory:
      values.padelCategory === "unknown" ? null : Number(values.padelCategory),
    preferredSide:
      values.preferredSide === "unset"
        ? null
        : (values.preferredSide as PlayerPatchInput["preferredSide"]),
    dominantHand:
      values.dominantHand === "unset"
        ? null
        : (values.dominantHand as PlayerPatchInput["dominantHand"]),
  };
}
