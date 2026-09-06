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
  // `| null` added alongside padelCategory/preferredSide/dominantHand below
  // for the admin player-edit route (see
  // app/api/admin/players/[userId]/route.ts) — an admin can explicitly
  // clear this field, which updateUserProfile's Prisma call needs to accept
  // as null, not just omit. Existing callers passing a plain string (or
  // omitting it) are unaffected.
  phone?: string | null;
  status: UserStatus;
  // Player-only self-reported skill level (1 = highest, 8 = beginner).
  // Optional/nullable: unset for owners and for players who haven't set it
  // yet. Added for the admin player-edit route — updateUserProfile's data
  // param is typed against this interface, so it needs this field to accept
  // a padelCategory edit; existing callers are unaffected since it's
  // optional.
  padelCategory?: number | null;
  // Player-only play-style fields — unset (undefined) until the player
  // edits their profile, or explicitly cleared (null) by the admin
  // player-edit route. Owners never set these.
  preferredSide?: PreferredSide | null;
  dominantHand?: DominantHand | null;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
