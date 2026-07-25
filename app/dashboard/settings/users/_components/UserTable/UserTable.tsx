"use client";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRoleBadge } from "../UserRoleBadge";
import type { UserProfile, SystemRole, UserStatus } from "@/core/users/types";
import { ROLE_OPTIONS, STATUS_VARIANT } from "./consts";
import type { CustomRoleEntry } from "@/app/actions/customRoles";

interface UserTableProps {
  users: UserProfile[];
  currentUserId: string;
  canEdit: boolean;
  customRoles: CustomRoleEntry[];
  onRoleChange: (uid: string, roleId: SystemRole) => Promise<void>;
  onStatusToggle: (uid: string, status: UserStatus) => Promise<void>;
  onAssignCustomRole: (
    uid: string,
    customRoleId: string | null,
  ) => Promise<void>;
}

export function UserTable({
  users,
  currentUserId,
  canEdit,
  customRoles,
  onRoleChange,
  onStatusToggle,
  onAssignCustomRole,
}: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>System Role</TableHead>
          <TableHead>Custom Role</TableHead>
          <TableHead>Status</TableHead>
          {canEdit && <TableHead className="w-[80px]">Active</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isPending = user.status === "PENDING";

          return (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.displayName}</TableCell>
              <TableCell className="text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell>
                {canEdit && !isSelf ? (
                  <Select
                    value={user.roleId}
                    onValueChange={(v) =>
                      onRoleChange(user.id, v as SystemRole)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <UserRoleBadge role={user.roleId} />
                )}
              </TableCell>
              <TableCell>
                {canEdit && !isSelf ? (
                  <Select
                    value={user.customRoleId ?? "__none__"}
                    onValueChange={(v) =>
                      onAssignCustomRole(user.id, v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="No custom role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No custom role</SelectItem>
                      {customRoles.map((cr) => (
                        <SelectItem key={cr.id} value={cr.id}>
                          {cr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : user.customRoleName ? (
                  <Badge variant="outline">{user.customRoleName}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[user.status] ?? "secondary"}>
                  {user.status}
                </Badge>
              </TableCell>
              {canEdit && (
                <TableCell>
                  <Switch
                    checked={user.status === "ACTIVE"}
                    disabled={isSelf || isPending}
                    onCheckedChange={(checked) =>
                      onStatusToggle(user.id, checked ? "ACTIVE" : "INACTIVE")
                    }
                  />
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
