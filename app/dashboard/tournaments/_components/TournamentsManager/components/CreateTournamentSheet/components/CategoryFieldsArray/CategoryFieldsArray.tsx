"use client";

import { useFieldArray } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { DEFAULT_CATEGORY_VALUES } from "../../consts";
import type { CategoryFieldsArrayProps } from "./types";

// An empty optional number input must resolve to `undefined`, never NaN —
// same setValueAs convention as CourtFormSheet's optional courtNumber field
// (a NaN would fail z.number().optional() and leave Create permanently
// disabled until the owner typed something into a field that's optional).
function toOptionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

/**
 * The repeatable "categories" field array — createTournamentSchema requires
 * at least one and there's no separate endpoint to add more after creation,
 * so this is the only place an owner ever defines a tournament's categories.
 */
export function CategoryFieldsArray({
  control,
  register,
  errors,
}: CategoryFieldsArrayProps) {
  const t = useTranslations("CategoryFieldsArray");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "categories",
  });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex flex-col gap-3 rounded-sm border p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {t("categoryNumber", { number: index + 1 })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={fields.length <= 1}
              aria-label={t("removeCategory")}
              onClick={() => remove(index)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <Field>
            <FieldLabel htmlFor={`category-name-${field.id}`}>
              {t("nameLabel")}
            </FieldLabel>
            <Input
              id={`category-name-${field.id}`}
              placeholder={t("namePlaceholder")}
              {...register(`categories.${index}.name`)}
              aria-invalid={!!errors?.[index]?.name}
            />
            <FieldError errors={[errors?.[index]?.name]} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`category-group-count-${field.id}`}>
              {t("groupCountLabel")}
            </FieldLabel>
            <Input
              id={`category-group-count-${field.id}`}
              type="number"
              min={1}
              step={1}
              {...register(`categories.${index}.groupCount`, {
                valueAsNumber: true,
              })}
              aria-invalid={!!errors?.[index]?.groupCount}
            />
            <FieldError errors={[errors?.[index]?.groupCount]} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`category-advances-${field.id}`}>
              {t("advancesPerGroupLabel")}
            </FieldLabel>
            <Input
              id={`category-advances-${field.id}`}
              type="number"
              min={1}
              step={1}
              {...register(`categories.${index}.advancesPerGroup`, {
                valueAsNumber: true,
              })}
              aria-invalid={!!errors?.[index]?.advancesPerGroup}
            />
            <FieldError errors={[errors?.[index]?.advancesPerGroup]} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`category-min-level-${field.id}`}>
              {t("minCategoryLevelLabel")}
            </FieldLabel>
            <Input
              id={`category-min-level-${field.id}`}
              type="number"
              step={1}
              {...register(`categories.${index}.minCategoryLevel`, {
                setValueAs: toOptionalNumber,
              })}
              aria-invalid={!!errors?.[index]?.minCategoryLevel}
            />
            <FieldError errors={[errors?.[index]?.minCategoryLevel]} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`category-max-level-${field.id}`}>
              {t("maxCategoryLevelLabel")}
            </FieldLabel>
            <Input
              id={`category-max-level-${field.id}`}
              type="number"
              step={1}
              {...register(`categories.${index}.maxCategoryLevel`, {
                setValueAs: toOptionalNumber,
              })}
              aria-invalid={!!errors?.[index]?.maxCategoryLevel}
            />
            <FieldError errors={[errors?.[index]?.maxCategoryLevel]} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`category-max-teams-${field.id}`}>
              {t("maxTeamsLabel")}
            </FieldLabel>
            <Input
              id={`category-max-teams-${field.id}`}
              type="number"
              min={1}
              step={1}
              {...register(`categories.${index}.maxTeams`, {
                setValueAs: toOptionalNumber,
              })}
              aria-invalid={!!errors?.[index]?.maxTeams}
            />
            <FieldError errors={[errors?.[index]?.maxTeams]} />
          </Field>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="gap-1.5"
        onClick={() => append(DEFAULT_CATEGORY_VALUES)}
      >
        <Plus className="size-4" />
        {t("addCategory")}
      </Button>
    </div>
  );
}
