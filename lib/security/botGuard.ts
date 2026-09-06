import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";

// Shared Vercel BotID gate for routes that accept human-only traffic (form
// submissions / mutating actions), not read/polling endpoints. Every path
// checked here MUST also be registered in instrumentation-client.ts's
// initBotId({ protect: [...] }) — the client-side component is what attaches
// the classification headers BotID reads; without it checkBotId() can't
// classify the request at all (see docs/SECURITY.md).
export async function checkBot(): Promise<NextResponse | null> {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  return null;
}
