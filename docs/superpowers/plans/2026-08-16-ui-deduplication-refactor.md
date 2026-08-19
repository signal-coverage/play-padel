# UI De-duplication Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract genuinely duplicated UI patterns (found by a 5-part codebase audit) into shared `components/` primitives, migrate their call sites onto the new primitives, migrate the three remaining hand-rolled owner-side tables onto the existing `components/DataTable`, and fix a small batch of unrelated cleanup items surfaced by the same audit.

**Architecture:** Eleven independent-as-possible tasks. Each new shared component is created and proven against its call sites in the same task (create + migrate together, not split) so no task leaves the app in a half-migrated state. Tasks are ordered so nothing depends on a later task.

**Tech Stack:** Next.js 16 App Router, TypeScript, React Hook Form + Zod, Radix UI primitives (`components/ui/*`), Tailwind CSS.

**Spec:** No separate spec doc — this plan implements the audit findings directly confirmed and approved in conversation (5 parallel research passes, synthesized into a list, user confirmed "go ahead with everything except the not-recommended section"). Excluded by that confirmation, do NOT touch: `CourtAvailabilityGrid`, `BookingConfirmDialog`/`BookingConfirmActions`, unifying the two different `getInitials` functions (name-based vs. email-based — they take different inputs and return different formats, not the same function), identity-cell components beyond `PlayersDirectory`/`ClubListPanel`, inline `Field`/`Input` form blocks elsewhere, `PlayerOverviewBanner`, `LatestPartnerCard` vs `PlayerProfileCard`, `ReservationRow`, `PlanPricingCard`, and `StatusBox` vs `Empty`.

## Global Constraints

- No git commands in any task — no `git add`/`commit`/`rm`/`reset`/`stash`. This project's standing rule is zero git mutations, ever, with no exceptions. Every task ends with a plain verification step, never a commit.
- Follow the existing SRP file convention (one render output per component; `types.ts`/`utils.ts`/`consts.ts` split out as needed) and keep `index.ts` barrel exports alphabetically sorted by exported name (enforced by `eslint-rules/sort-index-exports.mjs`).
- New shared components live directly under `components/<ComponentName>/`, matching where `DataTable` and `StatusBox` already live.
- English-only code, comments, and UI copy.
- Every file this plan touches may also contain unrelated, legitimate, already-shipped changes from other work in progress in this repo — read each file's actual current content before editing rather than trusting only the "Current:" snippets below, which were captured at plan-writing time.

---

### Task 1: `SortDirectionButton`

**Files:**

- Create: `components/SortDirectionButton/SortDirectionButton.tsx`
- Create: `components/SortDirectionButton/types.ts`
- Create: `components/SortDirectionButton/index.ts`
- Modify: `app/dashboard/players/_components/PlayersDirectory/components/PlayersFilterBar/PlayersFilterBar.tsx`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/ClubListPanel.tsx`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/ClubCourtsPanel.tsx`

**Interfaces:**

- Produces: `SortDirectionButton` component, props `{ direction: "asc" | "desc"; onToggle: () => void }`, exported from `@/components/SortDirectionButton`. No later task depends on this — each of the 3 call sites is migrated in this same task.

- [ ] **Step 1: Write `components/SortDirectionButton/types.ts`**

```typescript
export type SortDirectionButtonProps = {
  direction: "asc" | "desc";
  onToggle: () => void;
};
```

- [ ] **Step 2: Write `components/SortDirectionButton/SortDirectionButton.tsx`**

```tsx
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortDirectionButtonProps } from "./types";

export function SortDirectionButton({
  direction,
  onToggle,
}: SortDirectionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={
        direction === "asc"
          ? "Sort ascending, click to sort descending"
          : "Sort descending, click to sort ascending"
      }
      onClick={onToggle}
    >
      {direction === "asc" ? <ArrowUp /> : <ArrowDown />}
    </Button>
  );
}
```

- [ ] **Step 3: Write `components/SortDirectionButton/index.ts`**

```typescript
export { SortDirectionButton } from "./SortDirectionButton";
export type { SortDirectionButtonProps } from "./types";
```

- [ ] **Step 4: Migrate `PlayersFilterBar.tsx`**

Current (near the end of the component, inside the sort `div`):

```tsx
<Button
  type="button"
  variant="outline"
  size="icon"
  aria-label={
    sort.direction === "asc"
      ? "Sort ascending, click to sort descending"
      : "Sort descending, click to sort ascending"
  }
  onClick={() =>
    onSortChange({
      ...sort,
      direction: sort.direction === "asc" ? "desc" : "asc",
    })
  }
>
  {sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />}
</Button>
```

Replace with:

```tsx
<SortDirectionButton
  direction={sort.direction}
  onToggle={() =>
    onSortChange({
      ...sort,
      direction: sort.direction === "asc" ? "desc" : "asc",
    })
  }
/>
```

Update this file's imports: remove `ArrowDown, ArrowUp` from the `lucide-react` import (keep `Search`), remove `Button` if it's no longer used elsewhere in this file (check — it isn't, in the current version), add `import { SortDirectionButton } from "@/components/SortDirectionButton";`.

- [ ] **Step 5: Migrate `ClubListPanel.tsx`**

Current:

```tsx
<Button
  type="button"
  variant="outline"
  size="icon"
  aria-label={
    sort.direction === "asc"
      ? "Sort ascending, click to sort descending"
      : "Sort descending, click to sort ascending"
  }
  onClick={() => setSortDirection(sort.direction === "asc" ? "desc" : "asc")}
>
  {sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />}
</Button>
```

Replace with:

```tsx
<SortDirectionButton
  direction={sort.direction}
  onToggle={() => setSortDirection(sort.direction === "asc" ? "desc" : "asc")}
/>
```

Update imports the same way (remove `ArrowDown, ArrowUp` from `lucide-react`, remove `Button` import if unused elsewhere in the file — check first, this file may still need `Button` for something else since it also renders club rows; verify before removing).

- [ ] **Step 6: Migrate `ClubCourtsPanel.tsx`**

Current (in the "Sort by" section):

```tsx
<Button
  type="button"
  variant="outline"
  size="icon"
  aria-label={
    sort.direction === "asc"
      ? "Sort ascending, click to sort descending"
      : "Sort descending, click to sort ascending"
  }
  onClick={() => setSortDirection(sort.direction === "asc" ? "desc" : "asc")}
>
  {sort.direction === "asc" ? <ArrowUp /> : <ArrowDown />}
</Button>
```

Replace with:

```tsx
<SortDirectionButton
  direction={sort.direction}
  onToggle={() => setSortDirection(sort.direction === "asc" ? "desc" : "asc")}
/>
```

Update imports (remove `ArrowDown, ArrowUp` from `lucide-react` — keep `Image as ImageIcon`; `Button` is still used elsewhere in this file for other purposes, verify before touching that import).

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated `eslint-rules/sort-index-exports.mjs` warning.

---

### Task 2: `SearchInput`

**Files:**

- Create: `components/SearchInput/SearchInput.tsx`
- Create: `components/SearchInput/types.ts`
- Create: `components/SearchInput/index.ts`
- Modify: `app/dashboard/players/_components/PlayersDirectory/components/PlayersFilterBar/PlayersFilterBar.tsx`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/ClubListPanel.tsx`
- Modify: `app/dashboard/_components/DashboardHome/DashboardHome.tsx`

**Interfaces:**

- Produces: `SearchInput` component, props `{ value: string; onChange: (value: string) => void; placeholder: string; className?: string }`, exported from `@/components/SearchInput`. No later task depends on this.

- [ ] **Step 1: Write `components/SearchInput/types.ts`**

```typescript
export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};
```

- [ ] **Step 2: Write `components/SearchInput/SearchInput.tsx`**

```tsx
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/utils";
import type { SearchInputProps } from "./types";

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `components/SearchInput/index.ts`**

```typescript
export { SearchInput } from "./SearchInput";
export type { SearchInputProps } from "./types";
```

- [ ] **Step 4: Migrate `PlayersFilterBar.tsx`**

Current:

```tsx
<div className="relative sm:w-64">
  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
  <Input
    value={query}
    onChange={(e) => onQueryChange(e.target.value)}
    placeholder="Search players by name..."
    className="pl-8"
  />
</div>
```

Replace with:

```tsx
<SearchInput
  value={query}
  onChange={onQueryChange}
  placeholder="Search players by name..."
  className="sm:w-64"
/>
```

Update imports: remove `Search` from `lucide-react` (already removed `ArrowDown`/`ArrowUp` in Task 1 — this file's `lucide-react` import may now be empty/removable if nothing else uses it, check), remove `Input` from `@/components/ui/input` if unused elsewhere in this file (it isn't, in the current version — this was the only `Input` usage), add `import { SearchInput } from "@/components/SearchInput";`.

- [ ] **Step 5: Migrate `ClubListPanel.tsx`**

Current:

```tsx
<div className="relative">
  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
  <Input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Search clubs..."
    className="pl-8"
  />
</div>
```

Replace with:

```tsx
<SearchInput value={query} onChange={setQuery} placeholder="Search clubs..." />
```

Update imports similarly (remove `Search` from `lucide-react` if nothing else in the file needs it — check, since this file also uses other icons potentially; remove `Input` from `@/components/ui/input` if unused elsewhere).

- [ ] **Step 6: Migrate `DashboardHome.tsx`**

Current:

```tsx
        <div className="flex flex-1 items-center gap-2 max-w-208 lg:max-w-160">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cards…"
              className="w-full rounded-sm pl-8"
            />
          </div>
          {role === "owner" && (
```

Replace with:

```tsx
        <div className="flex flex-1 items-center gap-2 max-w-208 lg:max-w-160">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search cards…"
            className="w-full [&_input]:rounded-sm"
          />
          {role === "owner" && (
```

(The `[&_input]:rounded-sm` targets the inner `Input` to preserve this call site's original `rounded-sm` styling, since `SearchInput` doesn't expose a separate input-level className prop and adding one just for this single cosmetic difference isn't worth the extra prop surface — verify the rendered corner radius still looks right, `Input`'s own default radius may already match closely enough that this override is unnecessary; use your judgment and drop the arbitrary selector if it turns out redundant.)

Update imports: remove `Search` from `lucide-react`, remove `Input` from `@/components/ui/input`, add `import { SearchInput } from "@/components/SearchInput";`.

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

---

### Task 3: `ColorSwatch`

**Files:**

- Create: `components/ColorSwatch/ColorSwatch.tsx`
- Create: `components/ColorSwatch/types.ts`
- Create: `components/ColorSwatch/index.ts`
- Modify: `app/dashboard/courts/_components/CourtsView/components/CourtsTable/CourtsTable.tsx`
- Modify: `app/dashboard/browse/_components/BrowseCourts/components/ClubCourtsPanel/ClubCourtsPanel.tsx`

**Interfaces:**

- Produces: `ColorSwatch` component, props `{ color?: string; className?: string }`, exported from `@/components/ColorSwatch`. No later task depends on this.

- [ ] **Step 1: Write `components/ColorSwatch/types.ts`**

```typescript
export type ColorSwatchProps = {
  color?: string;
  className?: string;
};
```

- [ ] **Step 2: Write `components/ColorSwatch/ColorSwatch.tsx`**

```tsx
import { cn } from "@/lib/utils/utils";
import type { ColorSwatchProps } from "./types";

export function ColorSwatch({ color, className }: ColorSwatchProps) {
  return (
    <span
      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color ?? "#94a3b8" }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 3: Write `components/ColorSwatch/index.ts`**

```typescript
export { ColorSwatch } from "./ColorSwatch";
export type { ColorSwatchProps } from "./types";
```

- [ ] **Step 4: Migrate `CourtsTable.tsx`**

Current:

```tsx
<TableCell className="font-medium">
  <span className="flex items-center gap-2">
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: court.color ?? "#94a3b8" }}
      aria-hidden="true"
    />
    {court.name}
  </span>
</TableCell>
```

Replace with:

```tsx
<TableCell className="font-medium">
  <span className="flex items-center gap-2">
    <ColorSwatch color={court.color} />
    {court.name}
  </span>
</TableCell>
```

Add `import { ColorSwatch } from "@/components/ColorSwatch";`.

- [ ] **Step 5: Migrate `ClubCourtsPanel.tsx`**

Current (inside the `surfaceColor` column's `cell`, in the visible trigger, NOT the tooltip's tinted preview overlay — that one uses `color-mix(...)` for a different, deliberately distinct tinting effect and must NOT be touched):

```tsx
<div className="flex items-center gap-1.5 w-fit">
  <span
    className="h-2.5 w-2.5 shrink-0 rounded-full"
    style={{ backgroundColor: court.color ?? "#94a3b8" }}
    aria-hidden="true"
  />
  <span className="w-fit">{surfaceLabel(court.surface)}</span>
</div>
```

Replace with:

```tsx
<div className="flex items-center gap-1.5 w-fit">
  <ColorSwatch color={court.color} />
  <span className="w-fit">{surfaceLabel(court.surface)}</span>
</div>
```

Add `import { ColorSwatch } from "@/components/ColorSwatch";`. Do NOT touch the separate `color-mix(in oklch, ...)` tinted-overlay block later in the same `cell` function (the tooltip preview) — that's a genuinely different visual effect, not the same swatch pattern.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

---

### Task 4: `CurrencyAmountField` (unifies `CourtPriceField`/`ReservationFeeField`)

**Files:**

- Create: `components/CurrencyAmountField/CurrencyAmountField.tsx`
- Create: `components/CurrencyAmountField/types.ts`
- Create: `components/CurrencyAmountField/utils.ts`
- Create: `components/CurrencyAmountField/index.ts`
- Modify: `app/dashboard/courts/_components/CourtsView/components/CourtFormSheet/CourtFormSheet.tsx`
- Delete: `app/dashboard/courts/_components/CourtsView/components/CourtFormSheet/components/CourtPriceField/` (entire folder)
- Delete: `app/dashboard/courts/_components/CourtsView/components/CourtFormSheet/components/ReservationFeeField/` (entire folder)

**Interfaces:**

- Produces: `CurrencyAmountField` component, props `{ id: string; value: number | undefined; onChange: (value: number | undefined) => void; ariaInvalid?: boolean }`, exported from `@/components/CurrencyAmountField`. No later task depends on this.

- [ ] **Step 1: Write `components/CurrencyAmountField/types.ts`**

```typescript
export type CurrencyAmountFieldProps = {
  id: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  ariaInvalid?: boolean;
};
```

- [ ] **Step 2: Write `components/CurrencyAmountField/utils.ts`** (byte-identical to both old `utils.ts` files, just relocated)

```typescript
const priceFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatPriceDisplay(value: number | undefined): string {
  return value === undefined || Number.isNaN(value)
    ? ""
    : priceFormatter.format(value);
}

export function parsePriceInput(text: string): number | undefined {
  const digitsOnly = text.replace(/\D/g, "");
  return digitsOnly === "" ? undefined : Number(digitsOnly);
}
```

- [ ] **Step 3: Write `components/CurrencyAmountField/CurrencyAmountField.tsx`**

```tsx
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatPriceDisplay, parsePriceInput } from "./utils";
import type { CurrencyAmountFieldProps } from "./types";

// ARS-only for now (see lib/utils/currency.ts's formatCourtPrice, which
// makes the same simplification for the read-only display side). No
// required/invalid styling of its own beyond the optional ariaInvalid pass-
// through — a court price is optional, a reservation fee is required, and
// that distinction is enforced by the caller's Zod schema, not this field.
export function CurrencyAmountField({
  id,
  value,
  onChange,
  ariaInvalid,
}: CurrencyAmountFieldProps) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>ARS</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="5.000"
        value={formatPriceDisplay(value)}
        onChange={(event) => onChange(parsePriceInput(event.target.value))}
        aria-invalid={ariaInvalid}
      />
    </InputGroup>
  );
}
```

- [ ] **Step 4: Write `components/CurrencyAmountField/index.ts`**

```typescript
export { CurrencyAmountField } from "./CurrencyAmountField";
export type { CurrencyAmountFieldProps } from "./types";
```

- [ ] **Step 5: Migrate `CourtFormSheet.tsx`**

Read the file first to find the exact two usage sites (search for `ReservationFeeField` and `CourtPriceField`). Replace:

```tsx
<ReservationFeeField
  id="court-reservation-fee"
  value={reservationFee}
  onChange={(value) =>
    setValue("reservationFee", value ?? (0 as number), {
      shouldTouch: true,
    })
  }
  ariaInvalid={!!errors.reservationFee}
/>
```

with:

```tsx
<CurrencyAmountField
  id="court-reservation-fee"
  value={reservationFee}
  onChange={(value) =>
    setValue("reservationFee", value ?? (0 as number), {
      shouldTouch: true,
    })
  }
  ariaInvalid={!!errors.reservationFee}
/>
```

and:

```tsx
<CourtPriceField
  id="court-price"
  value={courtPrice}
  onChange={(value) => setValue("courtPrice", value, { shouldTouch: true })}
/>
```

with:

```tsx
<CurrencyAmountField
  id="court-price"
  value={courtPrice}
  onChange={(value) => setValue("courtPrice", value, { shouldTouch: true })}
/>
```

The exact `onChange` callback bodies above may not match the live file precisely (they were reconstructed from a partial view) — use whatever the actual current `onChange` implementations are, just swap the component name and props, don't rewrite the callback logic. Update imports: remove `import { ReservationFeeField } from "./components/ReservationFeeField";` and `import { CourtPriceField } from "./components/CourtPriceField";`, add `import { CurrencyAmountField } from "@/components/CurrencyAmountField";`.

- [ ] **Step 6: Delete the two old field folders**

Plain filesystem delete (not `git rm`) of `app/dashboard/courts/_components/CourtsView/components/CourtFormSheet/components/CourtPriceField/` and `.../ReservationFeeField/` in their entirety. Confirm via `grep -rl "CourtPriceField\|ReservationFeeField" app` first that `CourtFormSheet.tsx` (just migrated) is the only remaining reference before deleting.

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

---

### Task 5: `SelectField`

**Files:**

- Create: `components/SelectField/SelectField.tsx`
- Create: `components/SelectField/types.ts`
- Create: `components/SelectField/index.ts`
- Modify: `app/onboarding/_components/OnboardingWizard/components/steps/PadelProfileStep/PadelProfileStep.tsx`
- Modify: `app/onboarding/_components/OnboardingWizard/components/steps/PlayerProfileStep/PlayerProfileStep.tsx`

**Interfaces:**

- Produces: `SelectField<T>` generic component, props `{ control: Control<T>; name: Path<T>; label: string; options: { value: string; label: string }[]; placeholder?: string; error?: { message?: string }; description?: ReactNode }`, exported from `@/components/SelectField`. No later task depends on this.
- Explicitly NOT migrated: `CountryProvinceCityFields`'s three selects (`country`/`province`/`city`) — they have real cascading-cursor logic (dynamic `disabled`, dynamic placeholder, custom `onValueChange` handlers that reset downstream fields), which doesn't fit a generic label+options+error shape without either losing that behavior or bloating `SelectField` with cascade-specific props it has no other user for. Leave that file untouched.

- [ ] **Step 1: Write `components/SelectField/types.ts`**

```typescript
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

export type SelectFieldOption = {
  value: string;
  label: string;
};

export type SelectFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: SelectFieldOption[];
  placeholder?: string;
  description?: ReactNode;
  error?: { message?: string };
  /** Defaults to `name` — override only if two SelectFields on the same page would otherwise collide on id. */
  id?: string;
};
```

- [ ] **Step 2: Write `components/SelectField/SelectField.tsx`**

```tsx
import { Controller } from "react-hook-form";
import type { FieldValues } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectFieldProps } from "./types";

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  description,
  error,
  id,
}: SelectFieldProps<T>) {
  const fieldId = id ?? name;

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ?? undefined}
            onValueChange={field.onChange}
          >
            <SelectTrigger id={fieldId} aria-invalid={!!error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}
```

- [ ] **Step 3: Write `components/SelectField/index.ts`**

```typescript
export { SelectField } from "./SelectField";
export type { SelectFieldProps, SelectFieldOption } from "./types";
```

- [ ] **Step 4: Migrate `PadelProfileStep.tsx`**

Current (all three `Field`+`Controller`+`Select` blocks):

```tsx
      <Field>
        <FieldLabel htmlFor="padelCategory">Padel category</FieldLabel>
        <FieldDescription>
          Your skill-level ranking — Category 1 is the highest level, Category 8
          is a beginner.
        </FieldDescription>
        <Controller
          control={control}
          name="padelCategory"
          render={({ field }) => (
            <Select
              value={field.value ?? "unknown"}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="padelCategory">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PADEL_CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.padelCategory]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="preferredSide">Preferred side</FieldLabel>
        <Controller
          control={control}
          name="preferredSide"
          render={({ field }) => (
            <Select
              value={field.value ?? undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="preferredSide">
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {PREFERRED_SIDE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.preferredSide]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="dominantHand">Dominant hand</FieldLabel>
        <Controller
          control={control}
          name="dominantHand"
          render={({ field }) => (
            <Select
              value={field.value ?? undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="dominantHand">
                <SelectValue placeholder="Not set yet" />
              </SelectTrigger>
              <SelectContent>
                {DOMINANT_HAND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.dominantHand]} />
      </Field>
```

Note `padelCategory`'s Select defaults its displayed value to `"unknown"` when unset (rather than showing a placeholder like the other two) — `SelectField` doesn't have a "default value when null" concept, only a `placeholder`. Preserve this behavior by having the CALLER pass an already-defaulted value isn't possible through `SelectField`'s generic `Controller` wiring without special-casing it inside `SelectField` itself, which isn't worth adding for one field. Resolve this by keeping `padelCategory` as a small, deliberate exception: migrate `preferredSide` and `dominantHand` to `SelectField`, but leave `padelCategory` as its own inline `Field`/`Controller`/`Select` block exactly as it is today (don't force the `"unknown"` default through `SelectField`). Only 2 of the 3 selects in this file migrate.

Replace with:

```tsx
      <Field>
        <FieldLabel htmlFor="padelCategory">Padel category</FieldLabel>
        <FieldDescription>
          Your skill-level ranking — Category 1 is the highest level, Category 8
          is a beginner.
        </FieldDescription>
        <Controller
          control={control}
          name="padelCategory"
          render={({ field }) => (
            <Select
              value={field.value ?? "unknown"}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="padelCategory">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PADEL_CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.padelCategory]} />
      </Field>

      <SelectField
        control={control}
        name="preferredSide"
        label="Preferred side"
        placeholder="Not set yet"
        options={PREFERRED_SIDE_OPTIONS}
        error={errors.preferredSide}
      />

      <SelectField
        control={control}
        name="dominantHand"
        label="Dominant hand"
        placeholder="Not set yet"
        options={DOMINANT_HAND_OPTIONS}
        error={errors.dominantHand}
      />
```

Update imports: add `import { SelectField } from "@/components/SelectField";`. Keep `Field`, `FieldDescription`, `FieldError`, `FieldLabel`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` imports (still needed for the un-migrated `padelCategory` block).

- [ ] **Step 5: Migrate `PlayerProfileStep.tsx`**

Current:

```tsx
<Field>
  <FieldLabel htmlFor="gender">Gender *</FieldLabel>
  <Controller
    control={control}
    name="gender"
    render={({ field }) => (
      <Select value={field.value ?? undefined} onValueChange={field.onChange}>
        <SelectTrigger id="gender" aria-invalid={!!errors.gender}>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {GENDER_OPTIONS.map((g) => (
            <SelectItem key={g.value} value={g.value}>
              {g.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  />
  <FieldError errors={[errors.gender]} />
</Field>
```

Replace with:

```tsx
<SelectField
  control={control}
  name="gender"
  label="Gender *"
  placeholder="Select an option"
  options={GENDER_OPTIONS}
  error={errors.gender}
/>
```

Update imports: add `import { SelectField } from "@/components/SelectField";`. Remove `Field`, `FieldError`, `FieldLabel`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Controller` imports ONLY if nothing else in this file still uses them — check first, since this file also has plain `Input`-based fields (`firstName`, `lastName`, `email`, `zipCode`, `address`) that still use `Field`/`FieldLabel`/`FieldError` (keep those imports), and does NOT use `Controller`/`Select`/etc. elsewhere (those become removable).

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

---

### Task 6: `DashboardBentoCard`

**Files:**

- Create: `components/DashboardBentoCard/DashboardBentoCard.tsx`
- Create: `components/DashboardBentoCard/types.ts`
- Create: `components/DashboardBentoCard/index.ts`
- Modify: `app/dashboard/_components/DashboardHome/components/WeeklyLoadCard/WeeklyLoadCard.tsx`
- Modify: `app/dashboard/_components/DashboardHome/components/SessionLoadCard/SessionLoadCard.tsx`
- Modify: `app/dashboard/_components/DashboardHome/components/UpcomingCard/UpcomingCard.tsx`
- Modify: `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewCard/PlayerOverviewCard.tsx`

**Interfaces:**

- Produces: `DashboardBentoCard` component, props `{ title: string; animationDelay: string; className?: string; contentClassName?: string; children: ReactNode }`, exported from `@/components/DashboardBentoCard`. No later task depends on this.
- Explicitly NOT migrated: `HeroCard`/`HeroShell` — confirmed by reading both files that `HeroShell` is a full-bleed image-background hero section (`<section>` with a background `Image`, gradient overlay, heading/subheading/CTA), not a `Card`/`CardHeader`/`CardContent` shell at all. Genuinely different component, do not touch.

- [ ] **Step 1: Write `components/DashboardBentoCard/types.ts`**

```typescript
import type { ReactNode } from "react";

export type DashboardBentoCardProps = {
  title: string;
  /** CSS `animation-delay` value, e.g. `"80ms"` — matches this dashboard's existing staggered fade-up entrance convention. */
  animationDelay: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};
```

- [ ] **Step 2: Write `components/DashboardBentoCard/DashboardBentoCard.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { DashboardBentoCardProps } from "./types";

export function DashboardBentoCard({
  title,
  animationDelay,
  className,
  contentClassName,
  children,
}: DashboardBentoCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up rounded-sm border-primary px-2 py-5 [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">{title}</CardTitle>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write `components/DashboardBentoCard/index.ts`**

```typescript
export { DashboardBentoCard } from "./DashboardBentoCard";
export type { DashboardBentoCardProps } from "./types";
```

- [ ] **Step 4: Migrate `WeeklyLoadCard.tsx`**

Current (full file):

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerWeeklyLoad } from "./components/OwnerWeeklyLoad";
import { PlayerWeeklyLoad } from "./components/PlayerWeeklyLoad";

export function WeeklyLoadCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up rounded-sm border-primary px-2 py-5 [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "80ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">
          {role === "owner" ? "Daily volume" : "Weekly load"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        {role === "owner" ? <OwnerWeeklyLoad /> : <PlayerWeeklyLoad />}
      </CardContent>
    </Card>
  );
}
```

Replace with:

```tsx
import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerWeeklyLoad } from "./components/OwnerWeeklyLoad";
import { PlayerWeeklyLoad } from "./components/PlayerWeeklyLoad";

export function WeeklyLoadCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <DashboardBentoCard
      title={role === "owner" ? "Daily volume" : "Weekly load"}
      animationDelay="80ms"
      className={className}
      contentClassName="flex min-h-0 flex-1 flex-col justify-center gap-3"
    >
      {role === "owner" ? <OwnerWeeklyLoad /> : <PlayerWeeklyLoad />}
    </DashboardBentoCard>
  );
}
```

- [ ] **Step 5: Migrate `SessionLoadCard.tsx`**

Current (full file):

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerSessionLoad } from "./components/OwnerSessionLoad";
import { PlayerSessionLoad } from "./components/PlayerSessionLoad";

export function SessionLoadCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up rounded-sm border-primary px-2 py-5 [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "160ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">
          {role === "owner" ? "Cancellation rate" : "Session load"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        {role === "owner" ? <OwnerSessionLoad /> : <PlayerSessionLoad />}
      </CardContent>
    </Card>
  );
}
```

Replace with:

```tsx
import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerSessionLoad } from "./components/OwnerSessionLoad";
import { PlayerSessionLoad } from "./components/PlayerSessionLoad";

export function SessionLoadCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <DashboardBentoCard
      title={role === "owner" ? "Cancellation rate" : "Session load"}
      animationDelay="160ms"
      className={className}
      contentClassName="flex min-h-0 flex-1 flex-col justify-center gap-3"
    >
      {role === "owner" ? <OwnerSessionLoad /> : <PlayerSessionLoad />}
    </DashboardBentoCard>
  );
}
```

- [ ] **Step 6: Migrate `UpcomingCard.tsx`**

Current (full file):

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerUpcoming } from "./components/OwnerUpcoming";
import { PlayerUpcoming } from "./components/PlayerUpcoming";

export function UpcomingCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up shrink-0 overflow-visible rounded-sm px-3 py-5 border-primary [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "380ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">Upcoming</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-y-auto">
        {role === "owner" ? <OwnerUpcoming /> : <PlayerUpcoming />}
      </CardContent>
    </Card>
  );
}
```

Note this one has extra outer classes (`shrink-0 overflow-visible`) and a different `px-3` (not `px-2`) beyond the shared shell — pass them via `className` exactly as today, since `DashboardBentoCard`'s base classes already include `px-2 py-5` and Tailwind's `cn` (via `tailwind-merge`) will let a later `px-3` in `className` correctly override the base `px-2`.

Replace with:

```tsx
import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerUpcoming } from "./components/OwnerUpcoming";
import { PlayerUpcoming } from "./components/PlayerUpcoming";

export function UpcomingCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <DashboardBentoCard
      title="Upcoming"
      animationDelay="380ms"
      className={cn("shrink-0 overflow-visible px-3", className)}
      contentClassName="flex flex-1 flex-col overflow-y-auto"
    >
      {role === "owner" ? <OwnerUpcoming /> : <PlayerUpcoming />}
    </DashboardBentoCard>
  );
}
```

This still needs `cn` — keep `import { cn } from "@/lib/utils/utils";`, remove the `Card`/`CardContent`/`CardHeader`/`CardTitle` import.

- [ ] **Step 7: Migrate `PlayerOverviewCard.tsx`**

Current (full file):

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up flex h-full w-70 shrink-0 flex-col gap-4 overflow-hidden rounded-sm py-5 px-2 border-primary [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "180ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">Player Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <PlayerOverviewContent />
      </CardContent>
    </Card>
  );
}
```

Replace with:

```tsx
import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import { cn } from "@/lib/utils/utils";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  return (
    <DashboardBentoCard
      title="Player Overview"
      animationDelay="180ms"
      className={cn(
        "flex h-full w-70 shrink-0 flex-col gap-4 overflow-hidden",
        className,
      )}
      contentClassName="flex-1 overflow-y-auto"
    >
      <PlayerOverviewContent />
    </DashboardBentoCard>
  );
}
```

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

- [ ] **Step 9: Manual verification**

Run `npm run dev`, open the dashboard home as both an owner and a player. Confirm the 3-4 bento cards still render identically to before (same titles, same stagger timing on load, same content), and `UpcomingCard`'s slightly different outer styling (shrink-0/overflow-visible/px-3) still looks right next to the others.

---

### Task 7: `ConfirmDialog` (on the existing `AlertDialog` primitive)

**Files:**

- Create: `components/ConfirmDialog/ConfirmDialog.tsx`
- Create: `components/ConfirmDialog/types.ts`
- Create: `components/ConfirmDialog/index.ts`
- Modify: `app/dashboard/my-reservations/_components/MyReservations/components/CancelConfirmDialog/CancelConfirmDialog.tsx`
- Modify: `app/dashboard/courts/_components/CourtsView/CourtsView.tsx`
- Modify: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/ClosuresSheet.tsx`
- Modify: `app/dashboard/courts/_components/CourtsView/components/ClosuresSheet/components/ClosuresList/ClosuresList.tsx`

**Interfaces:**

- Produces: `ConfirmDialog` component, props `{ open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: ReactNode; cancelLabel?: string; confirmLabel: string; pendingLabel: string; isPending: boolean; onConfirm: () => void; variant?: "destructive" | "default" }`, exported from `@/components/ConfirmDialog`. No later task depends on this.
- Consumes: `AlertDialog`/`AlertDialogContent`/`AlertDialogHeader`/`AlertDialogTitle`/`AlertDialogDescription`/`AlertDialogFooter`/`AlertDialogCancel` (`@/components/ui/alert-dialog`), `GuardedActionButton` (`@/components/GuardedActionButton`) — deliberately NOT `AlertDialogAction`, since `AlertDialogAction` wraps Radix's `Dialog.Close` and auto-closes synchronously with its click, which would race an async mutation (this is why `CourtsView.tsx`'s existing deactivate dialog already avoids it — same reasoning carries into the new shared component).
- Explicitly NOT migrated: `BookingConfirmDialog`/`BookingConfirmActions` — its 3-state payment branching (free / pay-now / price-missing) and desktop-dialog/mobile-drawer responsive split are the actual point of that component; do not touch it.

- [ ] **Step 1: Write `components/ConfirmDialog/types.ts`**

```typescript
import type { ReactNode } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  variant?: "destructive" | "default";
};
```

- [ ] **Step 2: Write `components/ConfirmDialog/ConfirmDialog.tsx`**

```tsx
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GuardedActionButton } from "@/components/GuardedActionButton";
import type { ConfirmDialogProps } from "./types";

// Deliberately uses GuardedActionButton instead of AlertDialogAction for the
// confirm button: AlertDialogAction wraps Radix's Dialog.Close, whose click
// handler unconditionally closes the dialog in the same synchronous click —
// racing an async onConfirm mutation. GuardedActionButton + the caller's own
// onOpenChange guard (see useGuardedDialogClose) keep the dialog open until
// the mutation actually settles.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  variant = "destructive",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <GuardedActionButton
            variant={variant}
            isPending={isPending}
            onClick={onConfirm}
          >
            {isPending ? pendingLabel : confirmLabel}
          </GuardedActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Write `components/ConfirmDialog/index.ts`**

```typescript
export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./types";
```

- [ ] **Step 4: Migrate `CancelConfirmDialog.tsx`**

Current (full file):

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GuardedActionButton } from "@/components/GuardedActionButton";
import type { CancelConfirmDialogProps } from "./types";
import { formatCancelTargetDateTime } from "./utils";

export function CancelConfirmDialog({
  open,
  onOpenChange,
  target,
  isSubmitting,
  onConfirm,
}: CancelConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Cancel reservation?</DialogTitle>
          <DialogDescription className="tabular-nums">
            {target
              ? `${target.courtName} · ${formatCancelTargetDateTime(target.scheduledStart)}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Keep reservation
          </Button>
          <GuardedActionButton
            variant="destructive"
            isPending={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "Cancelling…" : "Cancel reservation"}
          </GuardedActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Replace with:

```tsx
"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { CancelConfirmDialogProps } from "./types";
import { formatCancelTargetDateTime } from "./utils";

export function CancelConfirmDialog({
  open,
  onOpenChange,
  target,
  isSubmitting,
  onConfirm,
}: CancelConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel reservation?"
      description={
        target
          ? `${target.courtName} · ${formatCancelTargetDateTime(target.scheduledStart)}`
          : undefined
      }
      cancelLabel="Keep reservation"
      confirmLabel="Cancel reservation"
      pendingLabel="Cancelling…"
      isPending={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}
```

Note: `AlertDialogDescription` renders as a `<p>`-like text element and doesn't have a built-in `tabular-nums` class the old `DialogDescription className="tabular-nums"` had. If the date/time text needs tabular-nums styling preserved, wrap it: `description={target ? <span className="tabular-nums">{...}</span> : undefined}`. Use your judgment on whether this is visually necessary — check how the date renders before and after.

Also note: the old version's `DialogContent onPointerDownOutside={(e) => e.preventDefault()}` prevented outside-click dismissal; `ConfirmDialog`/`AlertDialogContent` doesn't currently accept or forward that prop. If preventing outside-click dismissal on a destructive confirmation is important to preserve (it likely is, to avoid an accidental miss-click canceling a reservation confirmation prematurely), check whether `AlertDialogContent` already has this behavior by default (Radix's `AlertDialog` primitive, unlike `Dialog`, does NOT close on outside click by default — this is part of why `AlertDialog` is the semantically correct primitive for confirmations in the first place). Verify this is actually the case (check Radix's AlertDialog docs or test manually) rather than assuming; if it turns out `AlertDialogContent` still needs an explicit prop to fully match the old behavior, add an `onPointerDownOutside`-forwarding prop to `ConfirmDialog`'s own props and pass `(e) => e.preventDefault()` from this call site — but only if you confirm it's actually needed.

- [ ] **Step 5: Migrate `CourtsView.tsx`'s deactivate dialog**

Read the file first to find the exact current block (search for `AlertDialog`). It currently looks like:

```tsx
<AlertDialog
  open={Boolean(courtPendingDeletion)}
  onOpenChange={handleDeleteDialogClose}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Deactivate court?</AlertDialogTitle>
      <AlertDialogDescription>
        {courtPendingDeletion
          ? `"${courtPendingDeletion.name}" will be marked inactive and hidden from new bookings. This can't be undone from here.`
          : ""}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      {/* ... comment about AlertDialogAction's auto-close race ... */}
      <GuardedActionButton
        variant="destructive"
        isPending={deleteCourt.isPending}
        onClick={/* whatever the actual confirm handler is */}
      >
        {deleteCourt.isPending ? "Deactivating…" : "Deactivate"}
      </GuardedActionButton>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Replace with (adapting the exact confirm handler name/logic from what you find in the live file — don't guess it, read it):

```tsx
<ConfirmDialog
  open={Boolean(courtPendingDeletion)}
  onOpenChange={handleDeleteDialogClose}
  title="Deactivate court?"
  description={
    courtPendingDeletion
      ? `"${courtPendingDeletion.name}" will be marked inactive and hidden from new bookings. This can't be undone from here.`
      : undefined
  }
  confirmLabel="Deactivate"
  pendingLabel="Deactivating…"
  isPending={deleteCourt.isPending}
  onConfirm={/* the same handler the current onClick calls */}
/>
```

Update imports: remove `AlertDialog`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` from `@/components/ui/alert-dialog` (unless anything else in this file still needs the raw primitive — check first), remove `GuardedActionButton` import if this was its only use in the file, add `import { ConfirmDialog } from "@/components/ConfirmDialog";`.

- [ ] **Step 6: Add the missing confirmation to closure cancellation, and fix `ClosuresList`'s empty state**

`ClosuresList.tsx` currently calls `onCancel(closure.id)` directly from its Cancel button with no confirmation step, and renders a bare `<p className="text-sm text-muted-foreground">No closures yet.</p>` for its empty state instead of the shared `StatusBox` its sibling `CourtsTable` uses for the same kind of message.

In `ClosuresList.tsx`, current:

```tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClosuresListProps } from "./types";

export function ClosuresList({
  closures,
  onCancel,
  cancellingClosureId,
}: ClosuresListProps) {
  const [now] = useState(() => Date.now());

  if (closures.length === 0) {
    return <p className="text-sm text-muted-foreground">No closures yet.</p>;
  }
```

Replace the empty-state line with:

```tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBox } from "@/components/StatusBox";
import type { ClosuresListProps } from "./types";

export function ClosuresList({
  closures,
  onCancel,
  cancellingClosureId,
}: ClosuresListProps) {
  const [now] = useState(() => Date.now());

  if (closures.length === 0) {
    return <StatusBox className="p-4">No closures yet.</StatusBox>;
  }
```

`onCancel` itself stays exactly as-is in `ClosuresList.tsx` — the confirmation step is added one level up, in `ClosuresSheet.tsx`, which is where the mutation (`cancelClosure`) actually lives. Read `ClosuresSheet.tsx`'s current `handleCancel`/rendering and add a pending-confirmation state around it. Current shape (from this plan's research):

```tsx
  async function handleCancel(closureId: string) {
    if (!courtId) return;
    try {
      await cancelClosure.mutateAsync({ courtId, closureId });
    } catch {
      // useCancelCourtClosure's onError already surfaces a toast
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onPointerDownOutside={(e) => e.preventDefault()}>
        ...
          {isLoading || !closures ? (
            <p className="text-sm text-muted-foreground">Loading closures…</p>
          ) : (
            <ClosuresList
              closures={closures}
              onCancel={handleCancel}
              cancellingClosureId={
                cancelClosure.isPending
                  ? (cancelClosure.variables?.closureId ?? null)
                  : null
              }
            />
          )}
        ...
```

Replace with (add a `closurePendingCancellation` state, use it to gate the actual mutation behind the new `ConfirmDialog`):

```tsx
  const [closurePendingCancellation, setClosurePendingCancellation] =
    useState<string | null>(null);

  async function handleConfirmCancel() {
    if (!courtId || !closurePendingCancellation) return;
    try {
      await cancelClosure.mutateAsync({
        courtId,
        closureId: closurePendingCancellation,
      });
      setClosurePendingCancellation(null);
    } catch {
      // useCancelCourtClosure's onError already surfaces a toast; leave the
      // dialog open so the user can retry or back out explicitly.
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onPointerDownOutside={(e) => e.preventDefault()}>
        ...
          {isLoading || !closures ? (
            <p className="text-sm text-muted-foreground">Loading closures…</p>
          ) : (
            <ClosuresList
              closures={closures}
              onCancel={setClosurePendingCancellation}
              cancellingClosureId={
                cancelClosure.isPending
                  ? (cancelClosure.variables?.closureId ?? null)
                  : null
              }
            />
          )}
        ...

      <ConfirmDialog
        open={closurePendingCancellation !== null}
        onOpenChange={(open) => {
          if (!open && !cancelClosure.isPending) {
            setClosurePendingCancellation(null);
          }
        }}
        title="Cancel this closure?"
        description="This will make the court bookable again for its blocked time range."
        cancelLabel="Keep closure"
        confirmLabel="Cancel closure"
        pendingLabel="Cancelling…"
        isPending={cancelClosure.isPending}
        onConfirm={handleConfirmCancel}
      />
    </Sheet>
  );
}
```

Add `import { useState } from "react";` (if not already imported) and `import { ConfirmDialog } from "@/components/ConfirmDialog";` to `ClosuresSheet.tsx`. The exact placement of the `ConfirmDialog` JSX (inside vs. adjacent to `SheetContent`) should follow whatever nesting makes sense once you read the actual current file — a `ConfirmDialog`/`AlertDialog` renders through a portal, so it doesn't need to be a literal child of `SheetContent` to work, but keep it visually grouped with the rest of this component's JSX for readability.

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

- [ ] **Step 8: Manual verification**

Run `npm run dev`. As an owner: open Courts, click deactivate on a court — confirm the dialog still looks and behaves the same (title, description, Cancel/Deactivate buttons, pending state). Open a court's closures, try cancelling an active closure — confirm a new "Cancel this closure?" dialog now appears before the closure actually cancels. As a player: cancel a reservation from My Reservations — confirm that dialog is unchanged.

---

### Task 8: Add `loadingCell` override to `DataTableColumn`, migrate `AuditLogsTable`

**Files:**

- Modify: `components/DataTable/types.ts`
- Modify: `components/DataTable/DataTable.tsx`
- Modify: `app/dashboard/audit-logs/_components/AuditLogsView/components/AuditLogsTable/AuditLogsTable.tsx`

**Interfaces:**

- Produces: `DataTableColumn<T>` gains an optional `loadingCell?: ReactNode` field, used by `DataTable`'s loading branch instead of the default uniform skeleton when a column provides one. Tasks 9 and 10 (migrating `ReservationsTable`/`CourtsTable`) consume this to preserve their existing varied-width/pill-shaped loading skeletons instead of regressing to a uniform `w-20` bar on every column.

- [ ] **Step 1: Add `loadingCell` to `components/DataTable/types.ts`**

Current:

```typescript
export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};
```

Replace with:

```typescript
export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Custom loading-state placeholder for this column (e.g. a differently-sized or pill-shaped Skeleton). Falls back to a generic `h-4 w-20` Skeleton when omitted. */
  loadingCell?: ReactNode;
};
```

- [ ] **Step 2: Use `loadingCell` in `components/DataTable/DataTable.tsx`**

Current (inside the `isLoading` branch's row-rendering loop):

```tsx
<TableBody>
  {Array.from({ length: loadingRowCount }).map((_, index) => (
    <TableRow key={index}>
      {columns.map((column) => (
        <TableCell key={column.key}>
          <Skeleton className="h-4 w-20" />
        </TableCell>
      ))}
    </TableRow>
  ))}
</TableBody>
```

Replace with:

```tsx
<TableBody>
  {Array.from({ length: loadingRowCount }).map((_, index) => (
    <TableRow key={index}>
      {columns.map((column) => (
        <TableCell key={column.key}>
          {column.loadingCell ?? <Skeleton className="h-4 w-20" />}
        </TableCell>
      ))}
    </TableRow>
  ))}
</TableBody>
```

- [ ] **Step 3: Migrate `AuditLogsTable.tsx`**

Current (full file):

```tsx
import { format } from "date-fns";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActionLabel } from "../../utils";
import { LOADING_SKELETON_ROW_COUNT } from "./consts";
import type { AuditLogsTableProps } from "./types";

export function AuditLogsTable({ logs, isLoading }: AuditLogsTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-sm border">
        <span className="sr-only" role="status">
          Loading audit log…
        </span>
        <Table aria-hidden="true">
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: LOADING_SKELETON_ROW_COUNT }).map(
              (_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (logs.length === 0) {
    return <StatusBox>No audit log entries match these filters.</StatusBox>;
  }

  return (
    <div className="overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                {format(log.timestamp, "MMM d, HH:mm")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getActionLabel(log.action)}</Badge>
              </TableCell>
              <TableCell>{log.entity}</TableCell>
              <TableCell>{log.userDisplayName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

Replace with:

```tsx
import { useMemo } from "react";
import { format } from "date-fns";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getActionLabel } from "../../utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { AuditLogsTableProps } from "./types";

type AuditLogRow = AuditLogsTableProps["logs"][number];

export function AuditLogsTable({ logs, isLoading }: AuditLogsTableProps) {
  const columns: DataTableColumn<AuditLogRow>[] = useMemo(
    () => [
      {
        key: "when",
        header: "When",
        className: "whitespace-nowrap tabular-nums text-muted-foreground",
        cell: (log) => format(log.timestamp, "MMM d, HH:mm"),
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
      {
        key: "action",
        header: "Action",
        cell: (log) => (
          <Badge variant="outline">{getActionLabel(log.action)}</Badge>
        ),
        loadingCell: <Skeleton className="h-5 w-20 rounded-full" />,
      },
      {
        key: "entity",
        header: "Entity",
        cell: (log) => log.entity,
        loadingCell: <Skeleton className="h-4 w-28" />,
      },
      {
        key: "by",
        header: "By",
        cell: (log) => log.userDisplayName,
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      rows={logs}
      rowKey={(log) => log.id}
      isLoading={isLoading}
      loadingLabel="Loading audit log…"
      emptyState={
        <StatusBox>No audit log entries match these filters.</StatusBox>
      }
    />
  );
}
```

`AuditLogRow` is derived from `AuditLogsTableProps["logs"][number]` rather than importing a separate log-entry type directly, so this stays correct even if the underlying type's exact name/location differs from what this plan assumed — verify `AuditLogsTableProps` actually has a `logs: SomeType[]` shape (it does, per this task's own research) before relying on this indexed-access pattern.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open Audit Logs as an owner. Confirm the table renders the same 4 columns with the same data, the loading skeleton still shows the same per-column shapes (pill for Action, plain bars elsewhere) instead of DataTable's generic uniform skeleton, and the empty-state message still shows when filtered to nothing.

---

### Task 9: Migrate `ReservationsTable` to `DataTable`

**Files:**

- Modify: `app/dashboard/reservations/_components/ReservationsView/components/ReservationsTable/ReservationsTable.tsx`

**Interfaces:**

- Consumes: `DataTable`/`DataTableColumn` (`@/components/DataTable`, Task 8's `loadingCell` addition).

- [ ] **Step 1: Migrate `ReservationsTable.tsx`**

Current (full file):

```tsx
"use client";

import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { StatusBox } from "@/components/StatusBox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTimeRange, isActionable } from "../../utils";
import { ReservationActionButtons } from "../ReservationActionButtons";
import { LOADING_SKELETON_ROW_COUNT } from "./consts";
import type { ReservationsTableProps } from "./types";

export function ReservationsTable({
  reservations,
  isLoading,
  onAction,
  pendingReservationId,
}: ReservationsTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-sm border">
        <span className="sr-only" role="status">
          Loading reservations…
        </span>
        <Table aria-hidden="true">
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: LOADING_SKELETON_ROW_COUNT }).map(
              (_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Skeleton className="h-8 w-16 rounded-sm" />
                      <Skeleton className="h-8 w-16 rounded-sm" />
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (reservations.length === 0) {
    return <StatusBox>No reservations for this day.</StatusBox>;
  }

  return (
    <div className="overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Court</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => {
            const isPending = pendingReservationId === reservation.id;
            const actionable = isActionable(reservation.status);

            return (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">
                  {reservation.userName}
                </TableCell>
                <TableCell>{reservation.courtName}</TableCell>
                <TableCell className="tabular-nums">
                  {formatTimeRange(
                    reservation.scheduledStart,
                    reservation.scheduledEnd,
                  )}
                </TableCell>
                <TableCell>
                  <ReservationStatusBadge status={reservation.status} />
                </TableCell>
                <TableCell className="text-right">
                  {actionable ? (
                    <div className="flex justify-end gap-1">
                      <ReservationActionButtons
                        reservationId={reservation.id}
                        onAction={onAction}
                        isPending={isPending}
                        size="sm"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

Replace with:

```tsx
"use client";

import { useMemo } from "react";
import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeRange, isActionable } from "../../utils";
import { ReservationActionButtons } from "../ReservationActionButtons";
import type { DataTableColumn } from "@/components/DataTable";
import type { ReservationsTableProps } from "./types";

type ReservationRow = ReservationsTableProps["reservations"][number];

export function ReservationsTable({
  reservations,
  isLoading,
  onAction,
  pendingReservationId,
}: ReservationsTableProps) {
  const columns: DataTableColumn<ReservationRow>[] = useMemo(
    () => [
      {
        key: "player",
        header: "Player",
        className: "font-medium",
        cell: (reservation) => reservation.userName,
        loadingCell: <Skeleton className="h-4 w-28" />,
      },
      {
        key: "court",
        header: "Court",
        cell: (reservation) => reservation.courtName,
        loadingCell: <Skeleton className="h-4 w-20" />,
      },
      {
        key: "time",
        header: "Time",
        className: "tabular-nums",
        cell: (reservation) =>
          formatTimeRange(reservation.scheduledStart, reservation.scheduledEnd),
        loadingCell: <Skeleton className="h-4 w-24" />,
      },
      {
        key: "status",
        header: "Status",
        cell: (reservation) => (
          <ReservationStatusBadge status={reservation.status} />
        ),
        loadingCell: <Skeleton className="h-5 w-20 rounded-full" />,
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-right",
        className: "text-right",
        cell: (reservation) => {
          const isPending = pendingReservationId === reservation.id;
          if (!isActionable(reservation.status)) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex justify-end gap-1">
              <ReservationActionButtons
                reservationId={reservation.id}
                onAction={onAction}
                isPending={isPending}
                size="sm"
              />
            </div>
          );
        },
        loadingCell: (
          <div className="flex justify-end gap-1.5">
            <Skeleton className="h-8 w-16 rounded-sm" />
            <Skeleton className="h-8 w-16 rounded-sm" />
          </div>
        ),
      },
    ],
    [onAction, pendingReservationId],
  );

  return (
    <DataTable
      columns={columns}
      rows={reservations}
      rowKey={(reservation) => reservation.id}
      isLoading={isLoading}
      loadingLabel="Loading reservations…"
      emptyState={<StatusBox>No reservations for this day.</StatusBox>}
    />
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open Reservations as an owner for a day with reservations. Confirm all 5 columns render correctly, action buttons still work (confirm/cancel/no-show, whatever `ReservationActionButtons` exposes), the loading skeleton still shows the same per-column shapes, and the "no reservations" empty state still shows for an empty day.

---

### Task 10: Migrate `CourtsTable` to `DataTable`

**Files:**

- Modify: `app/dashboard/courts/_components/CourtsView/components/CourtsTable/CourtsTable.tsx`

**Interfaces:**

- Consumes: `DataTable`/`DataTableColumn` (`@/components/DataTable`, Task 8's `loadingCell`), `ColorSwatch` (`@/components/ColorSwatch`, Task 3).

- [ ] **Step 1: Migrate `CourtsTable.tsx`**

Current (full file, already includes Task 3's `ColorSwatch` migration — this task assumes Task 3 ran first):

```tsx
"use client";

import { CalendarClock, CalendarOff, Pencil, Trash2 } from "lucide-react";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCourtPrice } from "@/lib/utils/currency";
import { ColorSwatch } from "@/components/ColorSwatch";
import { indoorLabel, surfaceLabel } from "../../utils";
import { LOADING_SKELETON_ROW_COUNT } from "./consts";
import type { CourtsTableProps } from "./types";

export function CourtsTable({
  courts,
  isLoading,
  onEdit,
  onEditAvailability,
  onEditClosures,
  onDelete,
  deletingCourtId,
}: CourtsTableProps) {
  // ... loading branch and loaded branch as read during this plan's research,
  // 8 columns: Name (with ColorSwatch), Surface, Type, Reservation fee, Court
  // price, Minimum shift, Status, Actions (4 tooltip+icon buttons) ...
}
```

Read the ACTUAL current file yourself (it was captured during this plan's research and is reproduced in full detail in the task brief) rather than relying on this abbreviated placeholder — the real file has 8 real `TableHead`/`TableCell` pairs plus a 4-button Actions cell with `Tooltip` wrappers, all of which need to become one `DataTableColumn<Court>[]` array. Replace it with:

```tsx
"use client";

import { useMemo } from "react";
import { CalendarClock, CalendarOff, Pencil, Trash2 } from "lucide-react";
import { ColorSwatch } from "@/components/ColorSwatch";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCourtPrice } from "@/lib/utils/currency";
import { indoorLabel, surfaceLabel } from "../../utils";
import type { DataTableColumn } from "@/components/DataTable";
import type { CourtsTableProps } from "./types";

type CourtRow = CourtsTableProps["courts"][number];

export function CourtsTable({
  courts,
  isLoading,
  onEdit,
  onEditAvailability,
  onEditClosures,
  onDelete,
  deletingCourtId,
}: CourtsTableProps) {
  const columns: DataTableColumn<CourtRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        className: "font-medium",
        cell: (court) => (
          <span className="flex items-center gap-2">
            <ColorSwatch color={court.color} />
            {court.name}
          </span>
        ),
        loadingCell: <Skeleton className="h-4 w-32" />,
      },
      {
        key: "surface",
        header: "Surface",
        cell: (court) => surfaceLabel(court.surface),
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "type",
        header: "Type",
        cell: (court) => indoorLabel(court.indoor),
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "reservationFee",
        header: "Reservation fee",
        cell: (court) =>
          court.reservationFee !== undefined
            ? formatCourtPrice(court.reservationFee)
            : "—",
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "courtPrice",
        header: "Court price",
        cell: (court) =>
          court.courtPrice !== undefined
            ? formatCourtPrice(court.courtPrice)
            : "—",
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "minShift",
        header: "Minimum shift",
        cell: (court) => `${court.slotDurationMinutes} min`,
        loadingCell: <Skeleton className="h-4 w-16" />,
      },
      {
        key: "status",
        header: "Status",
        cell: (court) => (
          <Badge variant={court.active ? "default" : "secondary"}>
            {court.active ? "Active" : "Inactive"}
          </Badge>
        ),
        loadingCell: <Skeleton className="h-5 w-16 rounded-full" />,
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-right",
        className: "text-right",
        cell: (court) => (
          <div className="flex justify-end gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit availability for ${court.name}`}
                  onClick={() => onEditAvailability(court)}
                >
                  <CalendarClock />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit availability</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Manage closures for ${court.name}`}
                  onClick={() => onEditClosures(court)}
                >
                  <CalendarOff />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Manage closures</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${court.name}`}
                  onClick={() => onEdit(court)}
                >
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit court</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Deactivate ${court.name}`}
                  disabled={!court.active || deletingCourtId === court.id}
                  onClick={() => onDelete(court)}
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Deactivate court</TooltipContent>
            </Tooltip>
          </div>
        ),
        loadingCell: (
          <div className="flex justify-end gap-1.5">
            <Skeleton className="h-8 w-8 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-sm" />
          </div>
        ),
      },
    ],
    [onEdit, onEditAvailability, onEditClosures, onDelete, deletingCourtId],
  );

  return (
    <DataTable
      columns={columns}
      rows={courts}
      rowKey={(court) => court.id}
      isLoading={isLoading}
      loadingLabel="Loading courts…"
      emptyState={
        <StatusBox>
          No courts yet. Create your first court to get started.
        </StatusBox>
      }
    />
  );
}
```

The `LOADING_SKELETON_ROW_COUNT` const from `./consts` is no longer needed here (DataTable has its own `loadingRowCount` default of 5) — check `./consts.ts` for whether anything else in this feature still uses that constant before deleting it; if it's now unused entirely, remove the file, otherwise leave it.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open Courts as an owner. Confirm all 8 columns render correctly (including the color swatch next to each court's name), all 4 action buttons (edit availability, manage closures, edit, deactivate) still work with their tooltips, the loading skeleton still shows per-column shapes, and the empty state shows correctly with zero courts.

---

### Task 11: Cleanup batch — relocate `getInitials`, relocate `getPadelCategoryLabel`, fix `TermsStep`'s error rendering

**Files:**

- Create: `lib/utils/initials.ts`
- Delete the `getInitials` export from: `app/dashboard/_components/DashboardHome/components/PlayerOverview/utils.ts` (keep the file only if anything else in it still has content — check first)
- Modify (update the import path for `getInitials`, no logic change): `components/PlayerProfileCard/PlayerProfileCard.tsx`, `app/dashboard/settings/club/_components/ClubSettingsView/ClubSettingsView.tsx`, `app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx`, `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/ClubListPanel.tsx`, `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewBanner/PlayerOverviewBanner.tsx`, `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/LatestPartnerCard/LatestPartnerCard.tsx`
- Modify: `core/users/consts.ts` (add `getPadelCategoryLabel`)
- Modify: `app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils.ts` (remove `getPadelCategoryLabel`, keep `getBusiestWeekday`/`getBusiestTimeOfDay`/`getIsoDayIndex`/`getTimeOfDayIndex` — those are only used within this same feature area, not cross-feature, so they stay put)
- Modify (update the import path for `getPadelCategoryLabel`, no logic change): `components/PlayerProfileCard/PlayerProfileCard.tsx`, `app/dashboard/players/_components/PlayersDirectory/consts.tsx`, `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/LatestPartnerCard/LatestPartnerCard.tsx`
- Modify: `app/onboarding/_components/OnboardingWizard/components/steps/TermsStep/TermsStep.tsx`

**Interfaces:** None — this task doesn't produce anything a later task consumes; it's the last task in the plan.

**Note on scope:** this task deliberately does NOT touch the email-based `getInitials` in `app/dashboard/_components/AppNavbar/utils.ts` — per the audit and the user's confirmed exclusions, the two `getInitials` functions take different inputs (name vs. email) and are not the same function; only the name-based one is being relocated because it's the one reached into cross-feature 6 times from a folder (`PlayerOverview/`) that isn't really its semantic home.

- [ ] **Step 1: Write `lib/utils/initials.ts`** (relocated, logic unchanged)

```typescript
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
```

- [ ] **Step 2: Remove `getInitials` from `app/dashboard/_components/DashboardHome/components/PlayerOverview/utils.ts`**

Read the file's current full content first — if `getInitials` is the ONLY export in this file, delete the file entirely (and remove any now-dangling `index.ts`/barrel reference to it, if one exists). If the file has other exports too, just remove the `getInitials` function and its export, leaving the rest intact.

- [ ] **Step 3: Update every `getInitials` import site to `@/lib/utils/initials`**

Find every current import of the name-based `getInitials` (search for `from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils"` combined with `getInitials` usage — do NOT touch any import from `@/app/dashboard/_components/AppNavbar/utils`, that's the unrelated email-based one). Known sites to update (verify this list is complete by searching yourself, don't assume it's exhaustive):

- `components/PlayerProfileCard/PlayerProfileCard.tsx`
- `app/dashboard/settings/club/_components/ClubSettingsView/ClubSettingsView.tsx`
- `app/dashboard/players/_components/PlayersDirectory/PlayersDirectory.tsx`
- `app/dashboard/browse/_components/BrowseCourts/components/ClubListPanel/ClubListPanel.tsx`
- `app/dashboard/_components/DashboardHome/components/PlayerOverview/PlayerOverviewBanner/PlayerOverviewBanner.tsx`
- `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/LatestPartnerCard/LatestPartnerCard.tsx`

For each, change only the import line, e.g.:

```diff
-import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
+import { getInitials } from "@/lib/utils/initials";
```

No other code in these files changes — `getInitials`'s signature and behavior are identical, only its module path moves.

- [ ] **Step 4: Add `getPadelCategoryLabel` to `core/users/consts.ts`** (relocated, logic unchanged — this file already hosts `getPreferredSideLabel`/`getDominantHandLabel`, the natural home for player-profile label helpers)

Read `core/users/consts.ts`'s current full content, then append:

```typescript
import { PADEL_CATEGORY_OPTIONS } from "@/app/onboarding/types";

export function getPadelCategoryLabel(category: number | null): string {
  if (category === null) return "Not set yet";
  const option = PADEL_CATEGORY_OPTIONS.find(
    (o) => o.value === String(category),
  );
  return option?.label ?? `Category ${category}`;
}
```

(Merge this import with the file's existing imports rather than duplicating an import block — check what's already imported there first.)

- [ ] **Step 5: Remove `getPadelCategoryLabel` from `app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils.ts`**

Remove only the `getPadelCategoryLabel` function and its now-unused `PADEL_CATEGORY_OPTIONS` import (check first whether `PADEL_CATEGORY_OPTIONS` is used elsewhere in this same file — it shouldn't be, based on this plan's research, but verify). Keep `getBusiestWeekday`, `getBusiestTimeOfDay`, `getIsoDayIndex`, `getTimeOfDayIndex`, and the `WEEKDAY_LABELS`-based import untouched — those are unrelated and still belong here.

- [ ] **Step 6: Update every `getPadelCategoryLabel` import site to `@/core/users/consts`**

Known sites (verify completeness by searching yourself):

- `components/PlayerProfileCard/PlayerProfileCard.tsx`
- `app/dashboard/players/_components/PlayersDirectory/consts.tsx`
- `app/dashboard/_components/DashboardHome/components/PlayerOverview/components/PlayerStyleSection/components/LatestPartnerCard/LatestPartnerCard.tsx`

For each, change only the import line:

```diff
-import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
+import { getPadelCategoryLabel } from "@/core/users/consts";
```

If any of these files already import something else from `@/core/users/consts` (e.g. `getPreferredSideLabel`), merge into that same import statement instead of adding a second one.

- [ ] **Step 7: Fix `TermsStep.tsx`'s error rendering to use `FieldError`**

Current (both checkbox error blocks):

```tsx
{
  errors.confirmedAge && (
    <p className="text-sm text-destructive">{errors.confirmedAge.message}</p>
  );
}
```

and

```tsx
{
  errors.acceptedTerms && (
    <p className="text-sm text-destructive">{errors.acceptedTerms.message}</p>
  );
}
```

Replace both with the project's standard `FieldError` component (already used everywhere else for this exact purpose):

```tsx
<FieldError errors={[errors.confirmedAge]} />
```

and

```tsx
<FieldError errors={[errors.acceptedTerms]} />
```

Add `import { FieldError } from "@/components/ui/field";` to this file's imports.

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean, or only the pre-existing unrelated warning.

- [ ] **Step 9: Manual verification**

Run `npm run dev`. Spot-check that avatars/initials still render correctly in the Players table, Browse Courts' club list, the club settings logo preview, and the player-overview sidebar (nothing should look different — this task is a pure relocation). Check the onboarding Terms step still shows a validation error under each checkbox when submitting without checking them.
