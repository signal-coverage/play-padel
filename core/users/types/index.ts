export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";
export type SystemRole = "owner" | "player";

export interface UserProfile {
  id: string;
  role: SystemRole;
  // Optional: only club owners belong to a club — players don't.
  clubId?: string;
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
}
