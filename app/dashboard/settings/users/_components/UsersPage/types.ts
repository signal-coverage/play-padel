import type { UserProfile } from "@/core/users/types";
import type { CustomRoleEntry } from "@/app/actions/customRoles";

export interface UsersPageProps {
  users: UserProfile[];
  currentUserId: string;
  canEdit: boolean;
  canInvite: boolean;
  customRoles: CustomRoleEntry[];
}
