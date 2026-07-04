import { NextResponse } from "next/server";

import {
  EnableBankingRequestError,
  getEnableBankingAspsps
} from "@/lib/enable-banking/client";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const INITIAL_BANK_NAMES = ["CaixaBank", "ING"];

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "Necesitas iniciar sesión." },
      { status: 401 }
    );
  }

  if (!isEmailAllowed(user.email)) {
    return NextResponse.json(
      { ok: false, reason: "Este email no está autorizado." },
      { status: 403 }
    );
  }

  try {
    const aspsps = await getEnableBankingAspsps({
      country: "ES",
      psuType: "personal",
      service: "AIS"
    });
    const initialBanks = aspsps.filter((aspsp) =>
      INITIAL_BANK_NAMES.some((bankName) =>
        aspsp.name.toLowerCase().includes(bankName.toLowerCase())
      )
    );

    return NextResponse.json({
      ok: true,
      aspsps: initialBanks.map((aspsp) => ({
        name: aspsp.name,
        country: aspsp.country,
        logo: aspsp.logo,
        beta: aspsp.beta,
        maximumConsentValidity: aspsp.maximum_consent_validity
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
