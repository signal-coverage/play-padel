"use client";

export default function DashboardPage() {
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
    </div>
  );
}
