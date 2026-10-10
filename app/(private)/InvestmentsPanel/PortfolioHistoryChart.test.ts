import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortfolioHistoryChart } from "./PortfolioHistoryChart";

vi.mock("recharts", async () => {
  const { createElement } = await import("react");
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      children,
    LineChart: ({ children }: { children: React.ReactNode }) => children,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Line: () => null,
    Legend: () => null,
    Tooltip: ({
      content
    }: {
      content: React.ReactElement<Record<string, unknown>>;
    }) => {
      const point = {
        date: "2026-10-10",
        timestamp: Date.parse("2026-10-10T00:00:00Z"),
        cash: 0.6,
        investments: 3905.02
      };
      return createElement(content.type, {
        ...content.props,
        active: true,
        label: point.timestamp,
        payload: [
          { dataKey: "cash", name: "cash", value: point.cash, payload: point },
          {
            dataKey: "investments",
            name: "investments",
            value: point.investments,
            payload: point
          }
        ]
      });
    }
  };
});

describe("portfolio history tooltip", () => {
  it("renders the report date through the shared tooltip with a numeric axis", () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioHistoryChart, {
        points: [
          {
            date: "2026-10-10",
            timestamp: Date.parse("2026-10-10T00:00:00Z"),
            cash: 0.6,
            investments: 3905.02
          }
        ]
      })
    );

    expect(html).toContain("10 oct 2026");
    expect(html).toContain("Efectivo");
    expect(html).toContain("Inversiones");
    expect(html).not.toContain("Fecha no disponible");
  });
});
