import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Help & Support</h1>
        <p className="text-muted-foreground mt-1">
          Resources and documentation to help you get the most out of ERPFlow.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex items-start gap-4 rounded-lg border p-4">
          <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Documentation</p>
            <p className="text-muted-foreground text-sm mt-0.5">
              Full guides and reference documentation. Coming soon.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg border p-4">
          <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Support</p>
            <p className="text-muted-foreground text-sm mt-0.5">
              Contact the support team for help with your account.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-lg border p-4">
          <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">FAQ</p>
            <p className="text-muted-foreground text-sm mt-0.5">
              Frequently asked questions. Coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
