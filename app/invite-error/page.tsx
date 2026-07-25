export default function InviteErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold text-destructive">
          Profile setup failed
        </h1>
        <p className="text-muted-foreground">
          There was a problem setting up your account. Please contact your
          administrator to resolve this issue.
        </p>
      </div>
    </div>
  );
}
