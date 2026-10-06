import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLoadingOverlay } from "./loadingOverlay";

function createOverlay() {
  return createLoadingOverlay({
    frame: (callback) => Number(setTimeout(callback, 16)),
    cancelFrame: (id) => clearTimeout(id),
    delay: setTimeout,
    cancelDelay: clearTimeout
  });
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
describe("data-driven loading overlay", () => {
  it("fades in and stays present until data is ready", () => {
    const overlay = createOverlay();
    overlay.setLoading(true);
    expect(overlay.getSnapshot()).toEqual({ present: true, visible: false });
    vi.advanceTimersByTime(32);
    expect(overlay.getSnapshot()).toEqual({ present: true, visible: true });
    vi.advanceTimersByTime(10_000);
    expect(overlay.getSnapshot().visible).toBe(true);
    overlay.setLoading(false);
    expect(overlay.getSnapshot()).toEqual({ present: true, visible: false });
    vi.advanceTimersByTime(499);
    expect(overlay.getSnapshot().present).toBe(true);
    vi.advanceTimersByTime(1);
    expect(overlay.getSnapshot().present).toBe(false);
  });
  it("does not wait for the fade in when data arrives immediately", () => {
    const overlay = createOverlay();
    overlay.setLoading(true);
    overlay.setLoading(false);
    vi.advanceTimersByTime(32);
    expect(overlay.getSnapshot().visible).toBe(false);
    vi.advanceTimersByTime(468);
    expect(overlay.getSnapshot().present).toBe(false);
  });
  it("reverses fade out when another month starts loading", () => {
    const overlay = createOverlay();
    overlay.setLoading(true);
    vi.advanceTimersByTime(32);
    overlay.setLoading(false);
    vi.advanceTimersByTime(250);
    overlay.setLoading(true);
    vi.advanceTimersByTime(500);
    expect(overlay.getSnapshot()).toEqual({ present: true, visible: true });
  });
  it("shows no overlay for ready cached data and skips fades for reduced motion", () => {
    const overlay = createOverlay();
    overlay.setLoading(false);
    expect(overlay.getSnapshot().present).toBe(false);
    overlay.setLoading(true, true);
    expect(overlay.getSnapshot().visible).toBe(true);
    overlay.setLoading(false, true);
    expect(overlay.getSnapshot().present).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels work on disposal", () => {
    const overlay = createOverlay();
    const listener = vi.fn();
    overlay.subscribe(listener);
    overlay.setLoading(true);
    listener.mockClear();
    overlay.dispose();
    vi.runAllTimers();
    expect(listener).not.toHaveBeenCalled();
  });
});
