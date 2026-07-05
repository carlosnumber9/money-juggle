import "server-only";

import type {
  BankingDataSource,
  BankConnectionSummary,
  InstitutionAvailability
} from "@/lib/data/banking-data-source";
import { getBankingDataSource } from "@/lib/data/get-banking-data-source";
import type {
  BankInstitutionCard,
  PrivateHomeView,
  ProviderStatusView
} from "@/lib/views/private-home-types";

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

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export async function getPrivateHomeView(
  status?: string
): Promise<PrivateHomeView> {
  const dataSource = getBankingDataSource();
  const user = await dataSource.getCurrentUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  if (!user.isAllowed) {
    return { kind: "forbidden" };
  }

  const [connectionsResult, providerResult] = await Promise.all([
    loadConnections(dataSource, user.id),
    loadProviderStatus(dataSource)
  ]);
  const providerStatus: ProviderStatusView = providerResult.ok
    ? providerResult.value
    : {
        status: "error",
        reason: providerResult.reason,
        isDemo: dataSource.mode === "demo"
      };
  const institutionsResult =
    providerStatus.status === "success"
      ? await loadInstitutions(dataSource)
      : undefined;
  const bankCards = applyStatusMessage(
    buildBankCards({
      connectionsResult,
      institutionsResult,
      providerStatus
    }),
    status
  );

  return {
    kind: "ready",
    user: {
      email: user.email
    },
    providerStatus,
    bankCards
  };
}

async function loadConnections(
  dataSource: BankingDataSource,
  userId: string
): Promise<Result<BankConnectionSummary[]>> {
  try {
    return {
      ok: true,
      value: await dataSource.listBankConnections(userId)
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

async function loadProviderStatus(
  dataSource: BankingDataSource
): Promise<Result<ProviderStatusView>> {
  try {
    const application = await dataSource.getProviderApplication();

    return {
      ok: true,
      value: {
        status: "success",
        applicationName: application.name,
        isDemo: dataSource.mode === "demo"
      }
    };
  } catch (error) {
    return {
      ok: false,
      reason: getPublicErrorReason(
        error,
        "No se pudo comprobar la conexión con Enable Banking."
      )
    };
  }
}

async function loadInstitutions(
  dataSource: BankingDataSource
): Promise<Result<InstitutionAvailability[]>> {
  try {
    return {
      ok: true,
      value: await dataSource.listAvailableInstitutions()
    };
  } catch (error) {
    return {
      ok: false,
      reason: getPublicErrorReason(
        error,
        "No se pudo cargar la lista de bancos."
      )
    };
  }
}

function buildBankCards({
  connectionsResult,
  institutionsResult,
  providerStatus
}: {
  connectionsResult: Result<BankConnectionSummary[]>;
  institutionsResult?: Result<InstitutionAvailability[]>;
  providerStatus?: ProviderStatusView;
}): BankInstitutionCard[] {
  return BANKS.map((bank): BankInstitutionCard => {
    if (bank.provider === "manual") {
      return {
        ...bank,
        state: "unavailable",
        tooltip:
          "Trade Republic todavía no está disponible en esta conexión automática."
      };
    }

    const connection = connectionsResult.ok
      ? connectionsResult.value.find((candidate) =>
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

    if (providerStatus?.status === "error") {
      return {
        ...bank,
        state: "error",
        tooltip: providerStatus.reason
      };
    }

    if (!institutionsResult) {
      return {
        ...bank,
        state: "error",
        tooltip: "No se pudo comprobar la disponibilidad del banco."
      };
    }

    if (!institutionsResult.ok) {
      return {
        ...bank,
        state: "error",
        tooltip: institutionsResult.reason
      };
    }

    const institution = institutionsResult.value.find((candidate) =>
      candidate.name.toLowerCase().includes(bank.name.toLowerCase())
    );

    if (!institution) {
      return {
        ...bank,
        state: "unavailable",
        tooltip: `${bank.name} no aparece ahora mismo en la lista de Enable Banking.`
      };
    }

    return {
      ...bank,
      aspspName: institution.name,
      country: institution.country,
      state: "idle",
      tooltip: `${bank.name} disponible en Enable Banking.`
    };
  });
}

function applyStatusMessage(
  cards: BankInstitutionCard[],
  status: string | undefined
): BankInstitutionCard[] {
  if (!status || status === "linked" || !STATUS_MESSAGES[status]) {
    return cards;
  }

  return cards.map((card) => {
    if (card.provider !== "enable_banking" || card.state === "connected") {
      return card;
    }

    return {
      ...card,
      state: "error",
      tooltip: STATUS_MESSAGES[status]
    };
  });
}

function getPublicErrorReason(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "Falta configuración privada en el servidor.";
  }

  return fallback;
}
