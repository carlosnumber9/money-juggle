import { createElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DashboardSyncControlsProps } from "@/definitions";
import { DashboardSyncControls } from "./DashboardSyncControls";

const activity = vi.hoisted(() => ({
  controlsTarget: null as HTMLDivElement | null,
  beginSync: vi.fn()
}));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  createPortal: vi.fn(() => null)
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));
vi.mock("./SyncActivityProvider", () => ({
  useSyncActivity: () => activity
}));
vi.mock("./InitialLoadProvider", () => ({
  useInitialLoadReady: () => false
}));
vi.mock("./PrivateQueryProvider", () => ({
  usePrivateQuerySession: () => ({ rejectAccess: vi.fn() }),
  PrivateSignOut: ({ children }: { children: ReactNode }) => children
}));
vi.mock("./MonthlyTransactionsPanel/useMonthInvalidation", () => ({
  useMonthInvalidation: () => ({ invalidate: vi.fn() })
}));
vi.mock("./MonthlyExport/MonthlyExportButton", () => ({
  MonthlyExportButton: () => null
}));

const props: DashboardSyncControlsProps = {
  enabled: true,
  backfill: { status: "hidden" },
  exportPeriod: { defaultMonth: "2026-10", currentMonth: "2026-10" }
};

describe("dashboard sync controls hydration", () => {
  it("keeps the initial markup unchanged when the header slot already exists", () => {
    activity.controlsTarget = null;
    const serverHtml = renderToString(
      createElement(DashboardSyncControls, props)
    );

    // Streaming can hydrate the header before the dashboard boundary.
    // React uses the server snapshot for that boundary's first client render.
    activity.controlsTarget = {} as HTMLDivElement;
    const populatedSlotHtml = renderToString(
      createElement(DashboardSyncControls, props)
    );

    expect(populatedSlotHtml).toBe(serverHtml);
    expect(createPortal).not.toHaveBeenCalled();
    expect(serverHtml).toContain("Cerrar sesión");
  });
});
