import { NextResponse } from "next/server";

import { getBankingDataSource } from "@/lib/data/get-banking-data-source";
import { EnableBankingRequestError } from "@/lib/enable-banking/client";

export const runtime = "nodejs";

export async function GET() {
  const dataSource = getBankingDataSource();
  const user = await dataSource.getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "Necesitas iniciar sesión." },
      { status: 401 }
    );
  }

  if (!user.isAllowed) {
    return NextResponse.json(
      { ok: false, reason: "Este email no está autorizado." },
      { status: 403 }
    );
  }

  try {
    const application = await dataSource.getProviderApplication();

    return NextResponse.json({
      ok: true,
      application: {
        name: application.name,
        kid: application.kid,
        environment: application.environment,
        active: application.active,
        countries: application.countries,
        services: application.services,
        mode: dataSource.mode
      }
    });
  } catch (error) {
    console.error(
      "Enable Banking application check failed",
      getErrorMetadata(error)
    );

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

function getErrorMetadata(error: unknown) {
  if (error instanceof EnableBankingRequestError) {
    return {
      status: error.status,
      provider_error: error.providerError?.error,
      provider_message: error.providerError?.message
    };
  }

  if (!(error instanceof Error)) {
    return {};
  }

  return {
    name: error.name,
    code: getErrorCode(error),
    kind: isPrivateConfigurationError(error)
      ? "private-configuration"
      : "unexpected",
    message: getSafeErrorMessage(error)
  };
}

function isPrivateConfigurationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = getErrorCode(error);

  return (
    error.message.startsWith("Missing ") ||
    code === "ENOENT" ||
    code === "EACCES" ||
    code?.startsWith("ERR_OSSL_") ||
    error.message.includes("DECODER routines") ||
    error.message.includes("PEM routines") ||
    error.message.includes("bad decrypt")
  );
}

function getErrorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : undefined;
}

function getSafeErrorMessage(error: Error): string {
  if (!isPrivateConfigurationError(error)) {
    return error.message;
  }

  const code = getErrorCode(error);

  if (code === "ENOENT") {
    return "Enable Banking private key path could not be read.";
  }

  if (code === "EACCES") {
    return "Enable Banking private key path is not readable.";
  }

  if (code?.startsWith("ERR_OSSL_")) {
    return "Enable Banking private key could not be parsed or used for signing.";
  }

  if (error.message.startsWith("Missing ")) {
    return error.message;
  }

  return "Enable Banking private configuration is invalid.";
}
