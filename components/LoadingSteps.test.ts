import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoadingSteps } from "./LoadingSteps";

describe("loading steps markup", () => {
  it("renders bank-specific status icons with no account details", () => {
    const html = renderToStaticMarkup(
      createElement(LoadingSteps, {
        label: "Actualizando tus cuentas",
        busy: true,
        expanded: true,
        onToggle: vi.fn(),
        rows: [
          {
            id: "balances",
            label: "Actualizar saldos",
            status: "running",
            children: [
              {
                id: "one",
                label: "ING",
                status: "running",
                detail: "Consultando ING"
              },
              {
                id: "two",
                label: "CaixaBank",
                status: "completed",
                detail: "Actualización completada"
              }
            ]
          }
        ]
      })
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Consultando ING");
    expect(html).toContain("lucide-check");
    expect(html).toContain("lucide-loader-circle");
    expect(html).not.toContain("Cuenta terminada");
  });
  it("makes collapsed details inert and presents the reload action", () => {
    const html = renderToStaticMarkup(
      createElement(LoadingSteps, {
        label: "Actualizar",
        busy: false,
        expanded: false,
        onToggle: vi.fn(),
        onAction: vi.fn(),
        rows: []
      })
    );
    expect(html).toContain("Actualizar");
    expect(html).toContain('inert=""');
    expect(html).not.toContain("aria-expanded=");
    expect(html).toContain('type="button"');
  });
});
