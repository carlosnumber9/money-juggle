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
      1.35
    );
  });
  it("uses vertical distance and does not react to a faraway pointer", () => {
    expect(tabMagnification(bounds, { x: 122, y: 70 }, true)).toBe(1);
    expect(tabMagnification(bounds, { x: 122, y: 90 }, true)).toBeGreaterThan(
      1
    );
  });
  it("keeps enlarged mobile icons within their fixed hit areas", () => {
    const peak = tabMagnification(bounds, { x: 122, y: 122 }, true);
    expect(28 * peak).toBeLessThan(bounds.width);
    expect(28 * peak).toBeLessThan(bounds.height);
    expect(tabMagnification(bounds, { x: 141, y: 122 }, true)).toBeCloseTo(
      1.175
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
    expect(smoothTabScale(1, 1.35, 16)).toBeGreaterThan(1);
    expect(smoothTabScale(1, 1.35, 16)).toBeLessThan(1.35);
    let current = 1.35;
    for (let i = 0; i < 100; i++) current = smoothTabScale(current, 1, 16);
    expect(current).toBe(1);
  });
});
