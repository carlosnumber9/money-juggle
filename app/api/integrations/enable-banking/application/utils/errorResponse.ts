import { NextResponse } from "next/server";

import { EnableBankingRequestError } from "@/lib/enableBanking/client";

import { isPrivateConfigurationError } from "./privateConfigError";

export function getApplicationErrorResponse(error: unknown) {
  const status =
    error instanceof EnableBankingRequestError && error.status
      ? error.status
      : 502;

  return NextResponse.json(
    {
      ok: false,
      reason: getPublicErrorReason(error)
    },
    { status }
  );
}

function getPublicErrorReason(error: unknown): string {
  if (error instanceof EnableBankingRequestError) {
    return error.message;
  }

  if (isPrivateConfigurationError(error)) {
    return "La configuración privada de Enable Banking no se pudo cargar o firmar.";
  }

  return "No se pudo comprobar la conexión con Enable Banking.";
}
