import type {
  BANKS,
  BankConnectionSummary,
  BankInstitutionCard,
  InstitutionAvailability,
  ProviderStatusView,
  Result
} from "@/definitions";

import { isStaleLinkingConnection } from "./linkingState";

type BaseBank = (typeof BANKS)[number];

export function buildLinkingBankCard(
  bank: BaseBank,
  connection: BankConnectionSummary
): BankInstitutionCard {
  const isStaleLinking = isStaleLinkingConnection(connection);

  return {
    ...bank,
    aspspName: connection.institution?.name ?? bank.name,
    country: connection.institution?.country ?? undefined,
    state: isStaleLinking ? "stale-linking" : "linking",
    tooltip: isStaleLinking
      ? `La conexión con ${bank.name} parece atascada. Puedes reintentarla.`
      : `Conexión con ${bank.name} en curso.`
  };
}

export function buildErroredBankCard(
  bank: BaseBank,
  connection: BankConnectionSummary
): BankInstitutionCard {
  return {
    ...bank,
    aspspName: connection.institution?.name ?? bank.name,
    country: connection.institution?.country ?? undefined,
    state: "error",
    tooltip: `La conexión con ${bank.name} terminó con error.`
  };
}

export function buildAvailabilityBankCard(
  bank: BaseBank,
  input: {
    connectionsResult: Result<BankConnectionSummary[]>;
    institutionsResult?: Result<InstitutionAvailability[]>;
    providerStatus?: ProviderStatusView;
  }
): BankInstitutionCard {
  if (!input.connectionsResult.ok) {
    return { ...bank, state: "error", tooltip: input.connectionsResult.reason };
  }

  if (input.providerStatus?.status === "error") {
    return { ...bank, state: "error", tooltip: input.providerStatus.reason };
  }

  return buildInstitutionAvailabilityCard(bank, input.institutionsResult);
}

function buildInstitutionAvailabilityCard(
  bank: BaseBank,
  institutionsResult?: Result<InstitutionAvailability[]>
): BankInstitutionCard {
  if (!institutionsResult) {
    return {
      ...bank,
      state: "error",
      tooltip: "No se pudo comprobar la disponibilidad del banco."
    };
  }

  if (!institutionsResult.ok) {
    return { ...bank, state: "error", tooltip: institutionsResult.reason };
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
}
