import { describe, expect, it } from "vitest";
import {
  replaceSettingsLabel,
  resolveLabelNameEdit,
  sortSettingsLabels
} from "./labelEditor";

describe("inline label editing", () => {
  it.each(["", "  ", "\n\t", "Trip", "  Trip "])(
    "keeps the original name without saving %j",
    (draft) => {
      expect(resolveLabelNameEdit("Trip", draft)).toEqual({
        kind: "unchanged"
      });
    }
  );
  it("normalizes a changed name and preserves casing", () => {
    expect(resolveLabelNameEdit("Trip", "  Viaje   Lisboa \n 2026 ")).toEqual({
      kind: "save",
      name: "Viaje Lisboa 2026"
    });
    expect(resolveLabelNameEdit("Trip", "TRIP")).toEqual({
      kind: "save",
      name: "TRIP"
    });
  });
  it("accepts 80 characters and rejects longer names", () => {
    expect(resolveLabelNameEdit("Trip", "x".repeat(80))).toEqual({
      kind: "save",
      name: "x".repeat(80)
    });
    expect(resolveLabelNameEdit("Trip", "x".repeat(81))).toEqual({
      kind: "invalid"
    });
  });
  it("reorders renamed labels without changing IDs or mutating original data", () => {
    const labels = [
      { id: "1", name: "Lisboa" },
      { id: "2", name: "Madrid" }
    ];
    expect(
      replaceSettingsLabel(labels, { id: "2", name: "Barcelona" })
    ).toEqual([
      { id: "2", name: "Barcelona" },
      { id: "1", name: "Lisboa" }
    ]);
    expect(labels[1].name).toBe("Madrid");
    expect(sortSettingsLabels(labels)).not.toBe(labels);
  });
});
