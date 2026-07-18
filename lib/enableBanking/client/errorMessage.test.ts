import type { EnableBankingErrorResponse } from "@/definitions";
import { describe, expect, it } from "vitest";

import { getSafeErrorMessage } from "./errorMessage";

describe("getSafeErrorMessage", () => {
  it.each<[EnableBankingErrorResponse["error"], string]>([
    [
      "REDIRECT_URI_NOT_ALLOWED",
      "La URL de retorno no está autorizada en Enable Banking."
    ],
    [
      "NO_ACCOUNTS_ADDED",
      "No hay cuentas permitidas para esta aplicación de Enable Banking."
    ],
    ["WRONG_ASPSP_PROVIDED", "Enable Banking no aceptó el banco seleccionado."],
    [
      "ASPSP_RATE_LIMIT_EXCEEDED",
      "El banco ha limitado temporalmente las solicitudes."
    ],
    ["ASPSP_TIMEOUT", "El banco tardó demasiado en responder."]
  ])("maps the provider error %s", (error, message) => {
    expect(getSafeErrorMessage(400, { error, message: "Provider error" })).toBe(
      message
    );
  });

  it.each([
    [
      401,
      "Enable Banking rejected the signed request. Check the application id and private key."
    ],
    [
      403,
      "Enable Banking rejected the signed request. Check the application id and private key."
    ],
    [
      404,
      "Enable Banking did not find the application for the provided key id."
    ],
    [
      429,
      "Enable Banking is temporarily unavailable or rate limited the request."
    ],
    [
      503,
      "Enable Banking is temporarily unavailable or rate limited the request."
    ],
    [400, "Enable Banking returned an unexpected response."]
  ])("uses a safe fallback for HTTP %i", (status, message) => {
    expect(getSafeErrorMessage(status, undefined)).toBe(message);
  });
});
