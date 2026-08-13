import { AuthLeftPanel } from "@/app/(auth)/_components/AuthLeftPanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-light min-h-dvh flex items-center justify-center p-4 sm:p-6 bg-muted">
      <div
        className="w-full flex md:h-170 overflow-hidden rounded-[20px]"
        style={{
          maxWidth: "1080px",
          boxShadow:
            "0 16px 48px -8px rgba(0,0,0,0.14), 0 4px 16px -4px rgba(0,0,0,0.08)",
        }}
      >
        <AuthLeftPanel />
        <div
          className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background"
          style={{ colorScheme: "light" }}
          data-clerk-auth
        >
          {children}
        </div>
      </div>
    </div>
  );
}
