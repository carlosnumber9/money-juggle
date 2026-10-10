import { expect, it, vi } from "vitest";
import type { BankingDataSource, PortfolioSnapshot } from "@/definitions";
import { buildInvestmentsView, loadInvestmentsView } from "./investments";
const snapshot: PortfolioSnapshot = {
  id: "id",
  revision: "revision",
  reportDate: "2026-10-10",
  currency: "EUR",
  cash: "0.6",
  investments: "10.000001",
  positions: [
    {
      name: "Small",
      isin: "IE00B4L5Y983",
      quantity: "1",
      price: "5",
      priceDate: "2026-10-09",
      value: "5"
    },
    {
      name: "Large",
      isin: "IE00B4ND3602",
      quantity: "1",
      price: "5",
      priceDate: "2026-10-09",
      value: "5.000001"
    }
  ]
};
it("sorts positions exactly and uses observed report dates for both series", () => {
  const view = buildInvestmentsView(snapshot, [
    snapshot,
    { ...snapshot, reportDate: "2026-09-01", cash: "2" }
  ]);
  expect(view.latest?.positions.map((row) => row.name)).toEqual([
    "Large",
    "Small"
  ]);
  expect(view.points).toHaveLength(2);
  expect(view.points[0]).toMatchObject({
    date: "2026-09-01",
    timestamp: Date.parse("2026-09-01T00:00:00Z"),
    cash: 2
  });
  expect(snapshot.positions[0].name).toBe("Small");
});
it("does not represent failed history reads as zero money", async () => {
  const source = {
    getLatestPortfolioSnapshot: vi.fn().mockResolvedValue(snapshot),
    listPortfolioHistory: vi.fn().mockRejectedValue(new Error("private"))
  } as unknown as BankingDataSource;
  expect(await loadInvestmentsView(source, "owner")).toMatchObject({
    latest: null,
    points: [],
    error: expect.any(String)
  });
});
