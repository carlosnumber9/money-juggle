import { describe, expect, it } from "vitest";

import { getCallbackParams } from "./params";

describe("getCallbackParams", () => {
  it("extracts successful authorization parameters", () => {
    const requestUrl = new URL(
      "https://app.example/auth/callback?state=state-1&code=code-1"
    );

    expect(getCallbackParams(requestUrl)).toEqual({
      state: "state-1",
      code: "code-1",
      providerError: null,
      providerErrorDescription: null
    });
  });

  it("extracts provider error parameters", () => {
    const requestUrl = new URL(
      "https://app.example/auth/callback?error=access_denied&error_description=Cancelled"
    );

    expect(getCallbackParams(requestUrl)).toEqual({
      state: null,
      code: null,
      providerError: "access_denied",
      providerErrorDescription: "Cancelled"
    });
  });
});
