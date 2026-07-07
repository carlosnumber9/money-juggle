import { NextResponse } from "next/server";

import { getBankingDataSource } from "@/lib/data/getBankingDataSource";
import { EnableBankingRequestError } from "@/lib/enableBanking/client";

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
    const institutions = await dataSource.listAvailableInstitutions();

    return NextResponse.json({
      ok: true,
      aspsps: institutions.map((institution) => ({
        name: institution.name,
        country: institution.country,
        logo: institution.logo,
        beta: institution.beta,
        maximumConsentValidity: institution.maximumConsentValidity
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: getPublicErrorReason(error)
      },
      { status: getErrorStatus(error) }
    );
  }
}

function getErrorStatus(error: unknown): number {
  return error instanceof EnableBankingRequestError && error.status
    ? error.status
    : 502;
}

function getPublicErrorReason(error: unknown): string {
  if (error instanceof EnableBankingRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "Falta configuración privada en el servidor.";
  }

  return "No se pudo cargar la lista de bancos.";
}
