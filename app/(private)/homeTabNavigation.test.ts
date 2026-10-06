import { describe, expect, it, vi } from "vitest";
import { createHomeTabNavigation } from "./homeTabNavigation";

describe("home tab navigation", () => {
  it("selects immediately and blocks repeated or competing requests", () => {
    const navigation = createHomeTabNavigation("dashboard");
    expect(navigation.select("transactions")).toBe(true);
    expect(navigation.getSnapshot()).toEqual({
      selectedTab: "transactions",
      loading: true
    });
    expect(navigation.select("evolution")).toBe(false);
    expect(navigation.select("dashboard")).toBe(false);
    expect(navigation.select("transactions")).toBe(false);
    expect(navigation.getSnapshot().selectedTab).toBe("transactions");
  });

  it("keeps the requested selection while the server transition is pending", () => {
    const navigation = createHomeTabNavigation("dashboard");
    navigation.select("evolution");
    navigation.synchronize("dashboard", true);
    expect(navigation.getSnapshot()).toEqual({
      selectedTab: "evolution",
      loading: true
    });
    navigation.synchronize("evolution", true);
    expect(navigation.getSnapshot().loading).toBe(true);
    navigation.synchronize("evolution", false);
    expect(navigation.getSnapshot().loading).toBe(false);
    expect(navigation.select("transactions")).toBe(true);
  });

  it("restores the committed section and unlocks after interruption", () => {
    const navigation = createHomeTabNavigation("dashboard");
    navigation.select("transactions");
    navigation.synchronize("dashboard", true);
    navigation.synchronize("dashboard", false);
    expect(navigation.getSnapshot()).toEqual({
      selectedTab: "dashboard",
      loading: false
    });
    expect(navigation.select("evolution")).toBe(true);
  });

  it("follows completed back and forward navigation", () => {
    const navigation = createHomeTabNavigation("evolution");
    navigation.synchronize("transactions", false);
    expect(navigation.getSnapshot()).toEqual({
      selectedTab: "transactions",
      loading: false
    });
    navigation.synchronize("evolution", false);
    expect(navigation.getSnapshot().selectedTab).toBe("evolution");
  });

  it("ignores the active tab and invalid values without starting loading", () => {
    const navigation = createHomeTabNavigation("dashboard");
    for (const tab of ["dashboard", "unknown", null, 1]) {
      expect(navigation.select(tab)).toBe(false);
    }
    expect(navigation.getSnapshot().loading).toBe(false);
  });

  it("notifies only on changes and releases subscriptions", () => {
    const navigation = createHomeTabNavigation("dashboard");
    const listener = vi.fn();
    const unsubscribe = navigation.subscribe(listener);
    navigation.synchronize("dashboard", false);
    expect(listener).not.toHaveBeenCalled();
    navigation.select("transactions");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    navigation.synchronize("transactions", false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
