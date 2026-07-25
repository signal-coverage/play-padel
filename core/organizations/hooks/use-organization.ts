"use client";

import { useContext } from "react";
import { OrgContext } from "@/providers/organization-provider";

export function useOrganization() {
  const ctx = useContext(OrgContext);
  if (ctx === null) {
    throw new Error(
      "useOrganization must be used inside <OrganizationProvider>",
    );
  }
  return ctx;
}
