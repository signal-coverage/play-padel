import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

export function hasClerkErrorCode(error: unknown, code: string): boolean {
  if (!error) return false;
  return (
    isClerkAPIResponseError(error) && error.errors.some((e) => e.code === code)
  );
}
