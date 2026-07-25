"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { listOrgUsers } from "@/app/actions/users";
import { getCustomRoles } from "@/app/actions/customRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersPage } from "./_components/UsersPage";
import type { UserProfile } from "@/core/users/types";
import type { CustomRoleEntry } from "@/app/actions/customRoles";

function UsersPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 flex gap-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-t px-4 py-3 flex items-center gap-8">
            <div className="flex items-center gap-2 w-24">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UsersSettingsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listOrgUsers(), getCustomRoles()]).then(
      ([usersResult, rolesResult]) => {
        if (usersResult.success) {
          setUsers(usersResult.data);
        } else {
          setError(usersResult.error ?? null);
        }
        if (rolesResult.success) {
          setCustomRoles(rolesResult.data);
        }
        setLoading(false);
      },
    );
  }, []);

  if (!hasPermission("users.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  if (loading) return <UsersPageSkeleton />;

  if (error) {
    return <p className="text-muted-foreground">Failed to load users.</p>;
  }

  if (users.length === 0) {
    return <p className="text-muted-foreground">No users found.</p>;
  }

  const canEdit = hasPermission("users.update");
  const canInvite = hasPermission("users.invite");

  return (
    <UsersPage
      users={users}
      currentUserId={user?.id ?? ""}
      canEdit={canEdit}
      canInvite={canInvite}
      customRoles={customRoles}
    />
  );
}
