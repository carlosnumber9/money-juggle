import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (effect: () => unknown) => effect()
}));
import { BankConnectionResultContent } from "./BankConnectionResultContent";
import { getBankConnectionResult } from "./result";

describe("authorization result window lifecycle", () => {
  const close = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal("window", { setTimeout, clearTimeout, close });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("keeps failed authorization and account review results open", () => {
    BankConnectionResultContent({
      result: getBankConnectionResult("account-match-required")
    });
    BankConnectionResultContent({
      result: getBankConnectionResult("aspsp-error")
    });
    vi.runAllTimers();
    expect(close).not.toHaveBeenCalled();
  });
  it("still closes a successful authorization window", () => {
    BankConnectionResultContent({ result: getBankConnectionResult("linked") });
    vi.advanceTimersByTime(749);
    expect(close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(close).toHaveBeenCalledOnce();
  });
});
