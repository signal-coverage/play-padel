"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { BrowseCourts } from "./_components/BrowseCourts";

export default function BrowsePage() {
  return (
    <NuqsAdapter>
      <BrowseCourts />
    </NuqsAdapter>
  );
}
