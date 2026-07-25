"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  type CustomRoleEntry,
} from "@/app/actions/customRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSION_GROUPS, PERMISSION_LABELS } from "./consts";

function RoleSheet({
  open,
  onOpenChange,
  role,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: CustomRoleEntry | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setPermissions(role?.permissions ?? []);
    }
  }, [open, role]);

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const result = role
      ? await updateCustomRole(role.id, {
          name: name.trim(),
          description: description.trim() || null,
          permissions,
        })
      : await createCustomRole({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
    setSaving(false);
    if (result.success) {
      toast.success(role ? "Role updated" : "Role created");
      onOpenChange(false);
      onSaved();
    } else {
      toast.error(result.error ?? "Failed to save role");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{role ? "Edit Role" : "New Role"}</SheetTitle>
          <SheetDescription>
            {role
              ? "Update the role name, description, and permissions."
              : "Create a custom role with specific permissions."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 py-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="role-name">Name *</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Receptionist"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="role-desc">Description</Label>
            <Input
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label>Permissions</Label>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                {group.permissions.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 pl-2">
                    <Checkbox
                      id={`perm-${perm}`}
                      checked={permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    <Label
                      htmlFor={`perm-${perm}`}
                      className="font-normal cursor-pointer"
                    >
                      {PERMISSION_LABELS[
                        perm as keyof typeof PERMISSION_LABELS
                      ] ?? perm}
                    </Label>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="px-4 pb-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CustomRolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<CustomRoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRole, setEditRole] = useState<CustomRoleEntry | null>(null);

  async function load() {
    const result = await getCustomRoles();
    if (result.success) {
      setRoles(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function handleNew() {
    setEditRole(null);
    setSheetOpen(true);
  }

  function handleEdit(role: CustomRoleEntry) {
    setEditRole(role);
    setSheetOpen(true);
  }

  async function handleDelete(role: CustomRoleEntry) {
    const result = await deleteCustomRole(role.id);
    if (result.success) {
      toast.success("Role deleted");
      load();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to delete role");
    }
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Custom Roles</h1>
          <Button onClick={handleNew}>New Role</Button>
        </div>

        {loading ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="w-30">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-6" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : roles.length === 0 ? (
          <p className="text-muted-foreground">
            No custom roles yet. Create one to assign granular permissions.
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="w-30">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {role.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.permissions.length}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.userCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(role)}
                        >
                          Edit
                        </Button>
                        {role.userCount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  className="text-destructive"
                                >
                                  Delete
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Unassign all users before deleting this role
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDelete(role)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <RoleSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          role={editRole}
          onSaved={() => {
            load();
            router.refresh();
          }}
        />
      </div>
    </TooltipProvider>
  );
}
