import { useTranslations } from "next-intl";
import { GateScreen } from "../GateScreen";

// New club-operational-gate cause: PENDING_APPROVAL (see
// lib/mercadopago/operationalStatus.ts). Mirrors ClubInactiveCard's
// structure/styling, but purely informational — an owner cannot self-approve
// their own club, so this renders no submit action at all (GateScreen omits
// its bottom button row entirely when submitLabel is not provided).
export function PendingApprovalCard() {
  const t = useTranslations("PendingApprovalCard");

  return <GateScreen title={t("title")} description={t("description")} />;
}
