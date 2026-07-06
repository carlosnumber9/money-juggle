import type * as React from "react";

import type { MonthlyTransactionSummary } from "./data-source";

export type PrivateLayoutView =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "authenticated";
      isDemo: boolean;
      user: {
        email: string | null;
      };
    };

export type BankInstitutionCard = {
  slug: "caixabank" | "ing" | "trade-republic";
  name: string;
  logoPath: string;
  provider: "enable_banking" | "manual";
  aspspName?: string;
  country?: string;
  state:
    | "loading"
    | "idle"
    | "connected"
    | "linking"
    | "stale-linking"
    | "error"
    | "unavailable";
  tooltip: string;
  balanceTotals?: Array<{
    amount: string;
    currency: string;
    fetchedAt: string | null;
  }>;
  accounts?: Array<{
    id: string;
    name: string;
    ibanLast4: string | null;
    accountType: string | null;
    latestBalance: {
      amount: string;
      currency: string;
      balanceType: string;
      referenceDate: string | null;
      fetchedAt: string;
    } | null;
  }>;
};

export type ProviderStatusView =
  | {
      status: "success";
      applicationName: string;
      isDemo: boolean;
    }
  | {
      status: "error";
      reason: string;
      isDemo: boolean;
    };

export type PrivateHomeView =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "ready";
      user: {
        email: string | null;
      };
      providerStatus: ProviderStatusView;
      bankCards: BankInstitutionCard[];
      monthlyTransactions: {
        range: {
          from: string;
          to: string;
        };
        rows: MonthlyTransactionSummary[];
        error: string | null;
      };
    };

export const BANKS = [
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

export const BANK_CONNECTION_STATUS_MESSAGES: Record<string, string> = {
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

export type PrivateLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export type BankInstitutionCardsProps = {
  cards: BankInstitutionCard[];
};

export type BankConnectionsPanelProps = {
  cards: BankInstitutionCard[];
};

export type MonthlyTransactionsPanelProps = {
  enabled: boolean;
  transactions: MonthlyTransactionSummary[];
  range: {
    from: string;
    to: string;
  };
  error: string | null;
};

export type EnableBankingStatusProps = {
  status: ProviderStatusView | { status: "loading" };
};
