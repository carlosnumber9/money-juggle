import { BANKS } from "@/definitions";
import type {
  BankConnectionSummary,
  BankInstitutionCard,
  InstitutionAvailability,
  ProviderStatusView,
  Result
} from "@/definitions";

import { buildConnectedBankCard } from "./connectedBankCard";
import { hasExpiredConsent } from "@/lib/enableBanking/sessionStatus";
import {
  buildAvailabilityBankCard,
  buildErroredBankCard,
  buildLinkingBankCard,
  buildMissingAccountsBankCard
} from "./bankCardStates";

export function buildBankCards(input: {
  connectionsResult: Result<BankConnectionSummary[]>;
  institutionsResult?: Result<InstitutionAvailability[]>;
  providerStatus?: ProviderStatusView;
}): BankInstitutionCard[] {
  return BANKS.map((bank): BankInstitutionCard => {
    return buildEnableBankingCard(bank, input);
  });
}

function buildEnableBankingCard(
  bank: (typeof BANKS)[number],
  input: Parameters<typeof buildBankCards>[0]
): BankInstitutionCard {
  const connection = getMatchingConnection(bank.name, input.connectionsResult);
  const beta = getMatchingInstitution(
    bank.name,
    input.institutionsResult
  )?.beta;

  if (
    connection &&
    (connection.status === "expired" ||
      connection.status === "revoked" ||
      (connection.status === "linked" &&
        connection.accounts.length > 0 &&
        hasExpiredConsent(connection.consent_expires_at)))
  ) {
    return {
      ...buildConnectedBankCard(bank, connection),
      beta,
      bankConnectionId: connection.id,
      aspspName: connection.institution?.name ?? bank.name,
      country: connection.institution?.country ?? undefined,
      state: "reconnection-required",
      tooltip: `El acceso a ${bank.name} ya no es válido. Vuelve a autorizar la conexión.`
    };
  }

  if (connection?.status === "linked") {
    if (connection.accounts.length === 0) {
      return { ...buildMissingAccountsBankCard(bank, connection), beta };
    }

    return { ...buildConnectedBankCard(bank, connection), beta };
  }

  if (connection?.status === "linking") {
    return { ...buildLinkingBankCard(bank, connection), beta };
  }

  if (connection?.status === "error") {
    return { ...buildErroredBankCard(bank, connection), beta };
  }

  return buildAvailabilityBankCard(bank, input);
}

function getMatchingInstitution(
  bankName: string,
  institutionsResult: Result<InstitutionAvailability[]> | undefined
) {
  return institutionsResult?.ok
    ? institutionsResult.value.find((candidate) =>
        candidate.name.toLowerCase().includes(bankName.toLowerCase())
      )
    : undefined;
}

function getMatchingConnection(
  bankName: string,
  connectionsResult: Result<BankConnectionSummary[]>
) {
  return connectionsResult.ok
    ? connectionsResult.value.find((candidate) =>
        candidate.institution?.name
          .toLowerCase()
          .includes(bankName.toLowerCase())
      )
    : undefined;
}
