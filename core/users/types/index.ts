export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";
export type SystemRole = "admin" | "staff" | "professional";

export interface UserProfile {
  id: string;
  organizationId: string;
  roleId: SystemRole;
  customRoleId?: string | null;
  customRoleName?: string | null;
  displayName: string;
  email: string;
  photoURL?: string;
  phone?: string;
  status: UserStatus;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  effectivePermissions?: string[];
}
