"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateUserProfile } from "@/app/actions/users";
import { assignCustomRole } from "@/app/actions/customRoles";
import { UserTable } from "../UserTable";
import { InviteUserSheet } from "../InviteUserSheet";
import { Button } from "@/components/ui/button";
import type { SystemRole, UserStatus } from "@/core/users/types";
import type { UsersPageProps } from "./types";

export function UsersPage({
  users,
  currentUserId,
  canEdit,
  canInvite,
  customRoles,
}: UsersPageProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);

  async function handleRoleChange(uid: string, roleId: SystemRole) {
    const result = await updateUserProfile(uid, { roleId });
    if (result.success) {
      toast.success("Role updated");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update role");
    }
  }

  async function handleStatusToggle(uid: string, status: UserStatus) {
    const result = await updateUserProfile(uid, {
      status: status as "ACTIVE" | "INACTIVE",
    });
    if (result.success) {
      toast.success("Status updated");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update status");
    }
  }

  async function handleAssignCustomRole(
    uid: string,
    customRoleId: string | null,
  ) {
    const result = await assignCustomRole(uid, customRoleId);
    if (result.success) {
      toast.success(
        customRoleId ? "Custom role assigned" : "Custom role removed",
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to assign custom role");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)}>Invite User</Button>
        )}
      </div>
      <UserTable
        users={users}
        currentUserId={currentUserId}
        canEdit={canEdit}
        customRoles={customRoles}
        onRoleChange={handleRoleChange}
        onStatusToggle={handleStatusToggle}
        onAssignCustomRole={handleAssignCustomRole}
      />
      {canInvite && (
        <InviteUserSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      )}
    </div>
  );
}
