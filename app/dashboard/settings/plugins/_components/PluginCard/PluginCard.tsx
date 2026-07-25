"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { PluginManifest } from "@/core/plugins/types";
import type { PluginRegistryEntry } from "@/core/plugins/types";
import type { Plan } from "@/core/organizations/types";
import { isPluginInPlan } from "@/lib/consts";
import {
  installPlugin,
  enablePlugin,
  disablePlugin,
  uninstallPlugin,
} from "@/app/actions/plugins";
import { usePlugins } from "@/providers/plugin-provider";
import { Button } from "@/components/ui/button";

interface PluginCardProps {
  manifest: PluginManifest;
  entry: PluginRegistryEntry | undefined;
  orgPlan: Plan;
  onRefresh: () => void;
}

export function PluginCard({
  manifest,
  entry,
  orgPlan,
  onRefresh,
}: PluginCardProps) {
  const [loading, setLoading] = useState(false);
  const { refetch: refetchPluginProvider } = usePlugins();

  async function handleAction(
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) {
    setLoading(true);
    const result = await action();
    if (!result.success) {
      toast.error(result.error ?? "Action failed");
    } else {
      toast.success(successMessage);
      refetchPluginProvider();
    }
    onRefresh();
    setLoading(false);
  }

  const isInstalled = entry !== undefined;
  const isEnabled = entry?.enabled ?? false;
  const includedInPlan = isPluginInPlan(manifest.id, orgPlan);

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">{manifest.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {manifest.description}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          v{manifest.version}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isInstalled ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              isEnabled
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isEnabled ? "Enabled" : "Disabled"}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
            Not installed
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {!isInstalled && !includedInPlan && (
          <Link
            href="/dashboard/settings/plan"
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Request
          </Link>
        )}
        {!isInstalled && includedInPlan && (
          <Button
            variant="default"
            disabled={loading}
            onClick={() =>
              handleAction(
                () => installPlugin(manifest.id),
                `${manifest.name} installed`,
              )
            }
          >
            Install
          </Button>
        )}
        {isInstalled && !isEnabled && !includedInPlan && (
          <Link
            href="/dashboard/settings/plan"
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Request
          </Link>
        )}
        {isInstalled && !isEnabled && includedInPlan && (
          <Button
            variant="default"
            disabled={loading}
            onClick={() =>
              handleAction(
                () => enablePlugin(manifest.id),
                `${manifest.name} enabled`,
              )
            }
          >
            Enable
          </Button>
        )}
        {isInstalled && isEnabled && (
          <Button
            variant="outline"
            disabled={loading}
            onClick={() =>
              handleAction(
                () => disablePlugin(manifest.id),
                `${manifest.name} disabled`,
              )
            }
          >
            Disable
          </Button>
        )}
        {isInstalled && (
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() =>
              handleAction(
                () => uninstallPlugin(manifest.id),
                `${manifest.name} uninstalled`,
              )
            }
          >
            Uninstall
          </Button>
        )}
      </div>
    </div>
  );
}
