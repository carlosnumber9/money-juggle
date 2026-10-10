import { describe, expect, it } from "vitest";
import { smoothTabScale, tabMagnification } from "./magnification";
const bounds = { left: 100, top: 100, width: 44, height: 44 };
describe("tab magnification", () => {
  it("starts smoothly sixteen pixels before the fixed hit area", () => {
    expect(tabMagnification(bounds, { x: 84, y: 122 }, true)).toBe(1);
    expect(tabMagnification(bounds, { x: 90, y: 122 }, true)).toBeGreaterThan(
      1
    );
    expect(tabMagnification(bounds, { x: 100, y: 122 }, true)).toBeGreaterThan(
      tabMagnification(bounds, { x: 90, y: 122 }, true)
    );
    expect(tabMagnification(bounds, { x: 122, y: 122 }, true)).toBeCloseTo(
      1.18
    );
  });
  it("uses vertical distance and does not react to a faraway pointer", () => {
    expect(tabMagnification(bounds, { x: 122, y: 70 }, true)).toBe(1);
    expect(tabMagnification(bounds, { x: 122, y: 90 }, true)).toBeGreaterThan(
      1
    );
  });
  it("gives each neighbor its own distance-based scale", () => {
    const pointer = { x: 139, y: 122 };
    const nearest = tabMagnification(bounds, pointer, true);
    const neighbor = tabMagnification({ ...bounds, left: 156 }, pointer, true);
    expect(nearest).toBeGreaterThan(neighbor);
    expect(neighbor).toBe(1);
    expect(
      tabMagnification({ ...bounds, left: 148 }, pointer, true)
    ).toBeGreaterThan(1);
  });
  it("resets with no pointer or disabled magnification", () => {
    expect(tabMagnification(bounds, null, true)).toBe(1);
    expect(tabMagnification(bounds, { x: 122, y: 122 }, false)).toBe(1);
  });
  it("smooths changes without overshooting and returns to rest", () => {
    expect(smoothTabScale(1, 1.18, 16)).toBeGreaterThan(1);
    expect(smoothTabScale(1, 1.18, 16)).toBeLessThan(1.18);
    let current = 1.18;
    for (let i = 0; i < 100; i++) current = smoothTabScale(current, 1, 16);
    expect(current).toBe(1);
  });
});
