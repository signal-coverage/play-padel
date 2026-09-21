import { getRequestConfig } from "next-intl/server";
import messages from "../messages/es.json";

// The app is Spanish-only, so this always resolves to the same locale and
// messages — a static import is simpler and equally correct for next-intl's
// getRequestConfig contract than the previous per-request dynamic import.
export default getRequestConfig(async () => {
  return {
    locale: "es",
    messages,
  };
});
