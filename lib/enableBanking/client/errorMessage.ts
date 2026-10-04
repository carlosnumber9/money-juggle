import type { EnableBankingErrorResponse } from "@/definitions";

export function getSafeErrorMessage(
  status: number,
  providerError: EnableBankingErrorResponse | undefined
): string {
  switch (providerError?.error) {
    case "EXPIRED_SESSION":
      return "El acceso al banco ha caducado. Vuelve a autorizar la conexión.";
    case "CLOSED_SESSION":
      return "La sesión bancaria está cerrada. Vuelve a autorizar la conexión.";
    case "REVOKED_SESSION":
      return "El acceso al banco se ha revocado. Vuelve a autorizar la conexión.";
    case "UNAUTHORIZED_ACCESS":
    case "AUTHORIZATION_NOT_PROVIDED":
      return "Enable Banking no pudo autenticar la solicitud del servidor.";
    case "UNAUTHORIZED_IP":
      return "Enable Banking no permite solicitudes desde esta dirección del servidor.";
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
    return "Enable Banking rechazó el acceso. Revisa el código del proveedor para conocer la causa.";
  }

  if (status === 404) {
    return "Enable Banking no encontró el recurso solicitado.";
  }

  if (status === 408 || status === 429 || status >= 500) {
    return "Enable Banking is temporarily unavailable or rate limited the request.";
  }

  return "Enable Banking returned an unexpected response.";
}
