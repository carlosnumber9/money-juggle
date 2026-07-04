import { NextResponse } from "next/server";

import {
  EnableBankingRequestError,
  getEnableBankingApplication
} from "@/lib/enable-banking/client";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    const application = await getEnableBankingApplication();

    return NextResponse.json({
      ok: true,
      application: {
        name: application.name,
        kid: application.kid,
        environment: application.environment,
        active: application.active,
        countries: application.countries,
        services: application.services
      }
    });
  } catch (error) {
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

  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "Falta configuración privada de Enable Banking en el servidor.";
  }

  return "No se pudo comprobar la conexión con Enable Banking.";
}
