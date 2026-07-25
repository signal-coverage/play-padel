"use client";

import { usePlugins } from "@/providers/plugin-provider";
import { useOrganization } from "@/core/organizations/hooks/use-organization";
import { usePermission } from "@/core/permissions/hooks/use-permission";

export function PluginWidgets() {
  const { enabledManifests } = usePlugins();
  const { organization } = useOrganization();
  const { hasPermission } = usePermission();

  const organizationId = organization?.id;

  const pluginsWithWidgets = enabledManifests.filter(
    (m) => m.widgets && m.widgets.length > 0,
  );

  if (!organizationId || pluginsWithWidgets.length === 0) {
    return null;
  }

  return (
    <>
      {pluginsWithWidgets.map((manifest) =>
        manifest.widgets!.map((widget) => {
          if (
            widget.requiredPermission &&
            !hasPermission(widget.requiredPermission)
          ) {
            return null;
          }

          const WidgetComponent = widget.component;

          return (
            <div
              key={widget.id}
              className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
            >
              <WidgetComponent organizationId={organizationId} />
            </div>
          );
        }),
      )}
    </>
  );
}
