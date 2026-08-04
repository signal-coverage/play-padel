interface NavigateAfterAuthParams {
  session?: { currentTask?: unknown } | null;
  decorateUrl: (url: string) => string;
}

export function createAuthNavigate(
  router: { push: (url: string) => void },
  targetPath: string,
) {
  return ({ session, decorateUrl }: NavigateAfterAuthParams) => {
    if (session?.currentTask) return;

    const url = decorateUrl(targetPath);
    if (url.startsWith("http")) {
      window.location.href = url;
    } else {
      router.push(url);
    }
  };
}
