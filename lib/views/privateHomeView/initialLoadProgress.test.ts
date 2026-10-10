import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createInitialLoadProgress } from "./initialLoadProgress";

describe("initial load milestones", () => {
  it("isolates requests and resolves every outstanding milestone on failure", async () => {
    const first = createInitialLoadProgress();
    const second = createInitialLoadProgress();
    const secondSession = vi.fn();
    void second.milestones.session.then(secondSession);
    first.report("session", "completed");
    expect(await first.milestones.session).toBe("completed");
    expect(secondSession).not.toHaveBeenCalled();
    first.fail();
    expect(await first.milestones.data).toBe("error");
    expect(await first.milestones.prepared).toBe("error");
    expect(await first.milestones.session).toBe("completed");
    second.report("session", "completed");
    expect(await second.milestones.session).toBe("completed");
  });
});
