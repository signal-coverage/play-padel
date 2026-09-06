import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(),
}));

import { checkBotId } from "botid/server";
import { checkBot } from "./botGuard";

const checkBotIdMock = checkBotId as unknown as ReturnType<typeof vi.fn>;

describe("checkBot", () => {
  beforeEach(() => {
    checkBotIdMock.mockReset();
  });

  it("returns null (allow) when checkBotId reports isBot: false", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: false });

    const result = await checkBot();

    expect(result).toBeNull();
  });

  it("returns a 403 JSON response when checkBotId reports isBot: true", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: true });

    const result = await checkBot();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body).toEqual({ error: "Access denied" });
  });
});
