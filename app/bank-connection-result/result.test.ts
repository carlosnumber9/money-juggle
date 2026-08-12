import { describe, expect, it } from "vitest";

import { getBankConnectionResult } from "./result";

describe("bank connection result", () => {
  it("presents a successful linked callback", () => {
    expect(getBankConnectionResult("linked")).toEqual({
      status: "linked",
      success: true,
      title: "Conexión completada",
      message: "Banco conectado. Ya puedo ver las cuentas autorizadas."
    });
  });

  it("presents a known provider error", () => {
    expect(getBankConnectionResult("provider-cancelled")).toMatchObject({
      status: "provider-cancelled",
      success: false,
      message: "La conexión se canceló antes de autorizar el acceso."
    });
  });

  it("does not expose an unknown query value", () => {
    expect(getBankConnectionResult("unexpected-provider-detail")).toMatchObject(
      {
        success: false,
        message: "No se pudo completar la conexión bancaria."
      }
    );
  });
});
