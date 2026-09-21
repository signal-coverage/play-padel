import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import type { CreateTournamentFormValues } from "../../types";

export type CategoryFieldsArrayProps = {
  control: Control<CreateTournamentFormValues>;
  register: UseFormRegister<CreateTournamentFormValues>;
  errors: FieldErrors<CreateTournamentFormValues>["categories"];
};
