"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { buildCreateTournamentFormSchema, DEFAULT_VALUES } from "./consts";
import { formValuesToApiInput } from "./utils";
import { CategoryFieldsArray } from "./components/CategoryFieldsArray";
import type { CreateTournamentFormValues } from "./types";
import type { CreateTournamentSheetProps } from "./types";

/**
 * Creates a tournament in DRAFT status — the owner reviews it afterwards and
 * publishes it separately (see TournamentRow's "Publicar" button) to open
 * registration. createTournamentSchema requires at least one category and
 * there's no endpoint to add more later, so CategoryFieldsArray is the only
 * place an owner ever defines them.
 */
export function CreateTournamentSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CreateTournamentSheetProps) {
  const t = useTranslations("CreateTournamentSheet");
  const tValidation = useTranslations("CreateTournamentSheetValidation");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<CreateTournamentFormValues>({
    resolver: zodResolver(buildCreateTournamentFormSchema(tValidation)),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset(DEFAULT_VALUES);
    }
    onOpenChange(nextOpen);
  }

  async function submit(values: CreateTournamentFormValues) {
    try {
      await onSubmit(formValuesToApiInput(values));
    } catch {
      // onSubmit (useCreateTournament's mutateAsync) already surfaces its
      // own error toast — keep the Sheet open with the entered values so
      // the owner can retry, same pattern as CourtFormSheet's submit.
      return;
    }
    handleOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-sm"
      >
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(submit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <Field>
            <FieldLabel htmlFor="tournament-name">{t("nameLabel")}</FieldLabel>
            <Input
              id="tournament-name"
              placeholder={t("namePlaceholder")}
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="tournament-description">
              {t("descriptionLabel")}
            </FieldLabel>
            <Textarea
              id="tournament-description"
              placeholder={t("descriptionPlaceholder")}
              {...register("description")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="tournament-registration-opens-at">
              {t("registrationOpensAtLabel")}
            </FieldLabel>
            <Input
              id="tournament-registration-opens-at"
              type="datetime-local"
              {...register("registrationOpensAt")}
              aria-invalid={!!errors.registrationOpensAt}
            />
            <FieldError errors={[errors.registrationOpensAt]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="tournament-registration-closes-at">
              {t("registrationClosesAtLabel")}
            </FieldLabel>
            <Input
              id="tournament-registration-closes-at"
              type="datetime-local"
              {...register("registrationClosesAt")}
              aria-invalid={!!errors.registrationClosesAt}
            />
            <FieldError errors={[errors.registrationClosesAt]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="tournament-start-date">
              {t("startDateLabel")}
            </FieldLabel>
            <Input
              id="tournament-start-date"
              type="date"
              {...register("startDate")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="tournament-end-date">
              {t("endDateLabel")}
            </FieldLabel>
            <Input
              id="tournament-end-date"
              type="date"
              {...register("endDate")}
              aria-invalid={!!errors.endDate}
            />
            <FieldError errors={[errors.endDate]} />
          </Field>

          <FieldSet>
            <FieldLegend variant="label">{t("categoriesLegend")}</FieldLegend>
            <CategoryFieldsArray
              control={control}
              register={register}
              errors={errors.categories}
            />
          </FieldSet>
        </form>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !isValid}
            onClick={() => void handleSubmit(submit)()}
          >
            {isSubmitting ? t("creating") : t("create")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
