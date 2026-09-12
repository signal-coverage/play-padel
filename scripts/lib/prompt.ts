/**
 * Thin wrapper around @clack/prompts — the same library behind most modern
 * "npm create ..." installers (Vite, Astro, etc.): arrow-key selects,
 * spinners, and the connected vertical-line steps that make a sequence of
 * prompts read as one guided flow instead of a series of separate
 * questions. scripts/menu.ts and scripts/actions/* only ever go through
 * this file, never `@clack/prompts` directly, so the escape-hatch
 * (Ctrl+C / Esc cancellation) is handled in exactly one place.
 */
import * as clack from "@clack/prompts";
import type { Option } from "@clack/prompts";
import { paint } from "./style";

export type MenuOption<T extends string> = {
  value: T;
  label: string;
  /** Shown dimmed next to the option once it's highlighted. */
  description?: string;
};

export function intro(title: string) {
  clack.intro(title);
}

export function outro(message: string) {
  clack.outro(message);
}

/** Prints a note (Ctrl+C / Esc during any prompt below) and exits cleanly. */
function exitOnCancel(): never {
  clack.cancel("Cancelled — nothing was touched.");
  process.exit(0);
}

function unwrap<T>(value: T | symbol): T {
  if (clack.isCancel(value)) exitOnCancel();
  // Safe past the isCancel check above — clack.isCancel narrows against
  // `unknown`, not this generic T, so TS can't narrow the union on its own.
  return value as T;
}

export async function askChoice<T extends string>(
  message: string,
  options: MenuOption<T>[],
): Promise<T> {
  // clack's own Option<Value> is a conditional type keyed on Value
  // (Primitive vs. not), which TS can't resolve against a still-generic T
  // here — the object shape below satisfies EITHER branch (label is always
  // provided, which is valid whether that branch marks it optional or
  // required), so this cast is just working around that inference gap, not
  // papering over a real mismatch.
  const value = await clack.select<T>({
    message,
    options: options.map((option) => ({
      value: option.value,
      label: option.label,
      ...(option.description ? { hint: option.description } : {}),
    })) as unknown as Option<T>[],
  });
  return unwrap(value);
}

/** Distinguishes a cancelled `askChoiceOrBack` prompt from any real string
 * the caller's own options could ever return. */
export const BACK: unique symbol = Symbol("back");

/**
 * Same prompt as askChoice, but cancelling (Esc/Ctrl+C) returns BACK instead
 * of exiting the process — lets a caller loop back to a PREVIOUS question
 * (e.g. menu.ts's top-level action choice, or which .env file to target)
 * rather than forcing a restart of the whole script for a simple wrong
 * selection. Only used where going back is actually safe (i.e. before
 * anything has touched the Prisma client — see menu.ts's own comment on
 * why looping back after that point is NOT safe); every other prompt in
 * this repo still hard-exits via askChoice/askText/askConfirm on cancel.
 */
export async function askChoiceOrBack<T extends string>(
  message: string,
  options: MenuOption<T>[],
): Promise<T | typeof BACK> {
  // Otherwise nothing on screen tells the user Esc is even an option here —
  // askChoice's own prompts never mention it, since for those it just exits.
  const value = await clack.select<T>({
    message: `${message} ${paint("dim", "(Esc to go back)")}`,
    options: options.map((option) => ({
      value: option.value,
      label: option.label,
      ...(option.description ? { hint: option.description } : {}),
    })) as unknown as Option<T>[],
  });
  if (clack.isCancel(value)) return BACK;
  // Safe past the isCancel check above — see unwrap's own comment for why
  // TS can't narrow this on its own.
  return value as T;
}

export async function askText(
  message: string,
  options: { placeholder?: string } = {},
): Promise<string> {
  const value = await clack.text({
    message,
    placeholder: options.placeholder,
    validate: (v) => (v?.trim() ? undefined : "This field is required."),
  });
  return unwrap(value);
}

export async function askConfirm(
  message: string,
  initialValue = false,
): Promise<boolean> {
  const value = await clack.confirm({ message, initialValue });
  return unwrap(value);
}

/** Start a spinner, run `task`, then stop it with a success/failure message. */
export async function withSpinner<T>(
  startMessage: string,
  task: () => Promise<T>,
  stopMessage?: (result: T) => string,
): Promise<T> {
  const s = clack.spinner();
  s.start(startMessage);
  try {
    const result = await task();
    s.stop(stopMessage ? stopMessage(result) : startMessage);
    return result;
  } catch (err) {
    s.error(startMessage);
    throw err;
  }
}

export const log = clack.log;

export function note(message: string, title?: string) {
  clack.note(message, title);
}

export function cancelAndExit(message: string): never {
  clack.cancel(message);
  process.exit(0);
}
