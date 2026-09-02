import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { ClubSettingsTabs } from "./_components/ClubSettingsTabs";

export default function ClubSettingsPage() {
  return (
    <OwnerOnlyGuard>
      <ClubSettingsTabs />
    </OwnerOnlyGuard>
  );
}
