import { z } from "zod";

export const inviteUserFormSchema = z.object({
  email: z.string().email("Valid email required"),
  roleId: z.enum(["admin", "staff", "professional"]),
});

export type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

export interface InviteUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
