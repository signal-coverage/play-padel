import { HelpView } from "./_components/HelpView";

// No guard — unlike AuditLogsPage (AdminOnlyGuard) or an OwnerOnlyGuard
// page, this page is for every signed-in user regardless of role: HelpView
// itself branches its content on the viewer's role (see HelpView.tsx).
export default function HelpPage() {
  return <HelpView />;
}
