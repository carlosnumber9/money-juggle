import { describe, expect, it } from "vitest";
import {
  applyDashboardProgress,
  buildInitialLoadRows,
  createDashboardProgress,
  failDashboardProgress,
  setViewProgress
} from "./loadingProgress";

describe("loading step feedback", () => {
  it.each([
    [
      "dashboard",
      "Cargando cuentas, saldos y movimientos",
      "Calculando ingresos y gastos"
    ],
    [
      "transactions",
      "Cargando movimientos, categorías y etiquetas",
      "Preparando el listado de movimientos"
    ],
    [
      "evolution",
      "Cargando datos del mes y del año",
      "Preparando gráficos y resúmenes"
    ]
  ])("uses initial load details for %s", (tab, loading, preparing) => {
    expect(
      buildInitialLoadRows({ session: "completed" }, tab)[1]
    ).toMatchObject({ status: "running", detail: loading });
    expect(
      buildInitialLoadRows({ session: "completed", data: "completed" }, tab)[2]
    ).toMatchObject({ status: "running", detail: preparing });
  });
  it("keeps each bank independent, including fresh and partial results", () => {
    let rows = applyDashboardProgress(createDashboardProgress(), {
      type: "banks",
      banks: [
        { id: "one", name: "ING" },
        { id: "two", name: "CaixaBank" }
      ]
    });
    rows = applyDashboardProgress(rows, {
      type: "bank",
      bankConnectionId: "one",
      resource: "balances",
      status: "running"
    });
    expect(rows[1].children?.map((child) => child.status)).toEqual([
      "running",
      "pending"
    ]);
    rows = applyDashboardProgress(rows, {
      type: "bank",
      bankConnectionId: "one",
      resource: "balances",
      status: "running",
      reason: "persisting"
    });
    expect(rows[1].children?.[0]).toMatchObject({
      status: "running",
      detail: "Guardando datos de ING"
    });
    rows = applyDashboardProgress(rows, {
      type: "bank",
      bankConnectionId: "one",
      resource: "balances",
      status: "warning",
      reason: "partial"
    });
    rows = applyDashboardProgress(rows, {
      type: "bank",
      bankConnectionId: "two",
      resource: "balances",
      status: "skipped",
      reason: "fresh"
    });
    rows = applyDashboardProgress(rows, {
      type: "phase",
      phase: "balances",
      status: "completed"
    });
    expect(rows[1]).toMatchObject({
      status: "warning",
      detail: "Actualización completada con avisos"
    });
    expect(rows[1].children?.[1].detail).toBe("Ya estaban actualizados");
    expect(rows[2].children?.every((child) => child.status === "pending")).toBe(
      true
    );
  });
  it("never marks an interrupted operation as a complete success", () => {
    const rows = failDashboardProgress(createDashboardProgress());
    expect(rows[0].status).toBe("error");
    expect(rows[1].status).toBe("skipped");
    expect(setViewProgress(rows, "completed")[0].status).toBe("error");
  });
  it.each(["deferred", "expired", "busy"] as const)(
    "keeps %s outcomes distinct from success",
    (reason) => {
      let rows = applyDashboardProgress(createDashboardProgress(), {
        type: "banks",
        banks: [{ id: "bank", name: "ING" }]
      });
      rows = applyDashboardProgress(rows, {
        type: "bank",
        bankConnectionId: "bank",
        resource: "transactions",
        status: "warning",
        reason
      });
      rows = applyDashboardProgress(rows, {
        type: "phase",
        phase: "transactions",
        status: "completed"
      });
      expect(rows[2].status).toBe("warning");
    }
  );
});
