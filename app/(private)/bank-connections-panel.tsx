import { isEmailAllowed } from "@/lib/auth/allowlist";
import { listUserEnableBankingConnections } from "@/lib/db/enable-banking-connections";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BankInstitutionCards } from "@/app/(private)/bank-institution-cards";

type BankConnectionsPanelProps = {
  status?: string;
};

export type BankInstitutionCard = {
  slug: "caixabank" | "ing" | "trade-republic";
  name: string;
  logoPath: string;
  provider: "enable_banking" | "manual";
  aspspName?: string;
  country?: string;
  state: "loading" | "idle" | "connected" | "linking" | "error" | "unavailable";
  tooltip: string;
};

const BANKS = [
  {
    slug: "caixabank",
    name: "CaixaBank",
    logoPath: "/assets/institutions/caixabank.svg",
    provider: "enable_banking"
  },
  {
    slug: "ing",
    name: "ING",
    logoPath: "/assets/institutions/ing.svg",
    provider: "enable_banking"
  },
  {
    slug: "trade-republic",
    name: "Trade Republic",
    logoPath: "/assets/institutions/trade-republic.svg",
    provider: "manual"
  }
] as const;

const STATUS_MESSAGES: Record<string, string> = {
  linked: "Banco conectado. Ya puedo ver las cuentas autorizadas.",
  "provider-cancelled": "La conexión se canceló antes de autorizar el acceso.",
  "provider-error": "Enable Banking devolvió un error durante la conexión.",
  "redirect-uri-not-allowed":
    "La URL de retorno no está autorizada en Enable Banking.",
  "no-accounts-added":
    "No hay cuentas permitidas para esta aplicación de Enable Banking.",
  "wrong-aspsp": "Enable Banking no aceptó el banco seleccionado.",
  "provider-access-denied":
    "La aplicación no tiene acceso al servicio solicitado en Enable Banking.",
  "wrong-request-parameters":
    "Enable Banking no aceptó los parámetros de la solicitud.",
  "authorization-code-error":
    "El código de autorización no es válido o ha caducado.",
  "psu-header-error":
    "Enable Banking requiere datos adicionales del navegador para esta operación.",
  "aspsp-error": "El banco devolvió un error durante la autorización.",
  "aspsp-rate-limited": "El banco ha limitado temporalmente las solicitudes.",
  "aspsp-timeout": "El banco tardó demasiado en responder.",
  "provider-authentication-error":
    "Enable Banking rechazó la autenticación de la aplicación.",
  "server-config-error": "Falta configuración privada en el servidor.",
  "connection-start-error": "No se pudo iniciar la conexión bancaria.",
  "callback-error": "No se pudo completar la conexión bancaria.",
  "invalid-state":
    "La respuesta del banco no coincide con una conexión iniciada.",
  "missing-code":
    "La respuesta del banco no incluyó el código de autorización.",
  "missing-state": "La respuesta del banco no incluyó el estado de seguridad."
};

export async function BankConnectionsPanel({
  status
}: BankConnectionsPanelProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !isEmailAllowed(user.email)) {
    return null;
  }

  const connectionsResult = await loadConnections(user.id);
  const cards = BANKS.map((bank): BankInstitutionCard => {
    if (bank.provider === "manual") {
      return {
        ...bank,
        state: "unavailable",
        tooltip:
          "Trade Republic todavía no está disponible en esta conexión automática."
      };
    }

    const connection = connectionsResult.ok
      ? connectionsResult.connections.find((candidate) =>
          candidate.institution?.name
            .toLowerCase()
            .includes(bank.name.toLowerCase())
        )
      : undefined;

    if (connection?.status === "linked") {
      return {
        ...bank,
        state: "connected",
        tooltip: `${bank.name} conectado correctamente.`
      };
    }

    if (connection?.status === "linking") {
      return {
        ...bank,
        state: "linking",
        tooltip: `Conexión con ${bank.name} en curso.`
      };
    }

    if (connection?.status === "error") {
      return {
        ...bank,
        state: "error",
        tooltip: `La conexión con ${bank.name} terminó con error.`
      };
    }

    if (!connectionsResult.ok) {
      return {
        ...bank,
        state: "error",
        tooltip: connectionsResult.reason
      };
    }

    return {
      ...bank,
      state: "loading",
      tooltip: `Comprobando disponibilidad de ${bank.name} en Enable Banking.`
    };
  });
  const visibleCards =
    status && status !== "linked" && STATUS_MESSAGES[status]
      ? cards.map((card) => {
          if (
            card.provider !== "enable_banking" ||
            card.state === "connected"
          ) {
            return card;
          }

          return {
            ...card,
            state: "error" as const,
            tooltip: STATUS_MESSAGES[status]
          };
        })
      : cards;

  return <BankInstitutionCards cards={visibleCards} />;
}

async function loadConnections(userId: string): Promise<
  | {
      ok: true;
      connections: Awaited<ReturnType<typeof listUserEnableBankingConnections>>;
    }
  | { ok: false; reason: string }
> {
  try {
    return {
      ok: true,
      connections: await listUserEnableBankingConnections(userId)
    };
  } catch (error) {
    return {
      ok: false,
      reason: getPublicErrorReason(
        error,
        "No se pudieron cargar las cuentas conectadas."
      )
    };
  }
}

function getPublicErrorReason(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "Falta configuración privada en el servidor.";
  }

  return fallback;
}
