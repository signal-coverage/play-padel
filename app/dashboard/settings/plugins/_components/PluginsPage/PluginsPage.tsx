"use client";

import { useCallback, useEffect, useState } from "react";
import { PLUGIN_REGISTRY } from "@/plugins";
import { getInstalledPlugins } from "@/app/actions/plugins";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/core/organizations/hooks/use-organization";
import type { PluginRegistryEntry } from "@/core/plugins/types";
import { PluginCard } from "@/app/dashboard/settings/plugins/_components/PluginCard";

export function PluginsPage() {
  const { organization } = useOrganization();
  const [installedPlugins, setInstalledPlugins] = useState<
    PluginRegistryEntry[]
  >([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getInstalledPlugins();
    if (result.success) {
      setInstalledPlugins(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pluginList = Object.values(PLUGIN_REGISTRY);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Plugins</h2>
        <p className="text-sm text-muted-foreground">
          Manage the plugins installed for your organization.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-24 mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pluginList.map((manifest) => {
            const entry = installedPlugins.find(
              (p) => p.pluginId === manifest.id,
            );
            return (
              <PluginCard
                key={manifest.id}
                manifest={manifest}
                entry={entry}
                orgPlan={organization?.plan ?? "FREE"}
                onRefresh={refresh}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
