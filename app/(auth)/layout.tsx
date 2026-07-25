import { AuthLeftPanel } from "@/app/(auth)/_components/AuthLeftPanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#F5F5F7" }}
    >
      <div
        className="w-full flex overflow-hidden rounded-[20px]"
        style={{
          maxWidth: "1080px",
          height: "680px",
          boxShadow:
            "0 16px 48px -8px rgba(0,0,0,0.14), 0 4px 16px -4px rgba(0,0,0,0.08)",
        }}
      >
        <AuthLeftPanel />
        <div
          className="flex-1 flex items-center justify-center"
          style={{ background: "#ffffff", colorScheme: "light" }}
          data-clerk-auth
        >
          {children}
        </div>
      </div>
    </div>
  );
}
