import type { EnableBankingErrorResponse } from "@/definitions";

export function getSafeErrorMessage(
  status: number,
  providerError: EnableBankingErrorResponse | undefined
): string {
  switch (providerError?.error) {
    case "REDIRECT_URI_NOT_ALLOWED":
      return "La URL de retorno no está autorizada en Enable Banking.";
    case "NO_ACCOUNTS_ADDED":
      return "No hay cuentas permitidas para esta aplicación de Enable Banking.";
    case "WRONG_ASPSP_PROVIDED":
      return "Enable Banking no aceptó el banco seleccionado.";
    case "ACCESS_DENIED":
      return "La aplicación no tiene acceso al servicio solicitado en Enable Banking.";
    case "WRONG_REQUEST_PARAMETERS":
      return "Enable Banking no aceptó los parámetros de la solicitud.";
    case "WRONG_AUTHORIZATION_CODE":
    case "EXPIRED_AUTHORIZATION_CODE":
      return "El código de autorización de Enable Banking no es válido o ha caducado.";
    case "PSU_HEADER_INVALID":
    case "PSU_HEADER_NOT_PROVIDED":
      return "Enable Banking requiere datos adicionales del navegador para esta operación.";
    case "ASPSP_ERROR":
      return "El banco devolvió un error durante la autorización.";
    case "ASPSP_RATE_LIMIT_EXCEEDED":
      return "El banco ha limitado temporalmente las solicitudes.";
    case "ASPSP_TIMEOUT":
      return "El banco tardó demasiado en responder.";
  }

  return getFallbackErrorMessage(status);
}

function getFallbackErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Enable Banking rejected the signed request. Check the application id and private key.";
  }

  if (status === 404) {
    return "Enable Banking did not find the application for the provided key id.";
  }

  if (status === 408 || status === 429 || status >= 500) {
    return "Enable Banking is temporarily unavailable or rate limited the request.";
  }

  return "Enable Banking returned an unexpected response.";
}
