export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "DELETED";
export type SystemRole = "owner" | "player";
export type PreferredSide = "forehand" | "backhand";
export type DominantHand = "right" | "left";

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
  // Player-only play-style fields — unset (undefined) until the player
  // edits their profile. Owners never set these.
  preferredSide?: PreferredSide;
  dominantHand?: DominantHand;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
