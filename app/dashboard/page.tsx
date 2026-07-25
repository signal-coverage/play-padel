"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, CreditCard, Puzzle } from "lucide-react";
// import { PLAN_VARIANT } from "@/lib/consts";
import { getGreeting } from "./utils";
// import { PluginWidgets } from "./_components/PluginWidgets";

export default function DashboardPage() {
  // const { organization, userProfile } = useOrganization();

  // const greeting = getGreeting();
  // const name = userProfile?.displayName ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {/* {greeting}, {name} */}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {/* {organization?.name} ·{" "} */}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Organization"
          value={"—"}
          sub={""}
          subVariant={"secondary"}
        />
        <StatCard
          icon={CreditCard}
          label="Plan"
          value={
            // (organization?.plan != null
            //   ? PLAN_LABEL[organization.plan]
            //   : undefined) ??
            // organization?.plan ??
            "—"
          }
          sub={""}
        />
        <StatCard
          icon={Puzzle}
          label="Modules enabled"
          value={String(0)}
          sub={"modules"}
        />
        <StatCard
          icon={CalendarDays}
          label="Member since"
          value={"—"}
          sub={""}
        />
      </div>

      {/* <PluginWidgets /> */}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  subVariant,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  subVariant?: "default" | "secondary" | "outline";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {sub &&
          (subVariant ? (
            <Badge variant={subVariant} className="mt-1 text-xs">
              {sub}
            </Badge>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          ))}
      </CardContent>
    </Card>
  );
}
