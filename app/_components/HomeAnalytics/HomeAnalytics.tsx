"use client";
import { useEffect } from "react";
import * as amplitude from "@amplitude/unified";

export function HomeAnalytics() {
  useEffect(() => {
    amplitude.track("Viewed Home Page", { prompt_version: "BA400.4" }); // helps improve this setup flow — safe to remove once you've verified the event lands
  }, []);

  return null;
}
