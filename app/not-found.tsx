import Link from "next/link";
import { LogoBadge } from "@/components/LogoBadge";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-muted">
      <div className="w-full max-w-md text-center space-y-4">
        <LogoBadge size="md" className="mx-auto" />
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-foreground">
            Page not found
          </h1>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
