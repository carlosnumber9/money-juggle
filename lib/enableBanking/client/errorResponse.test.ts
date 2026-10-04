import { describe, expect, it } from "vitest";
import { readEnableBankingError } from "./errorResponse";

describe("provider error normalization", () => {
  it("retains a session error code even without a provider message", async () => {
    await expect(
      readEnableBankingError(
        Response.json({ error: "EXPIRED_SESSION", code: 401 })
      )
    ).resolves.toMatchObject({ error: "EXPIRED_SESSION", code: 401 });
  });
  it("handles malformed error bodies without inventing a provider code", async () => {
    await expect(
      readEnableBankingError(
        new Response("{", { headers: { "content-type": "application/json" } })
      )
    ).resolves.toBeUndefined();
  });
});
