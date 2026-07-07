import { BANKS } from "@/definitions";
import type {
  BankConnectionSummary,
  BankInstitutionCard,
  InstitutionAvailability,
  ProviderStatusView,
  Result
} from "@/definitions";

import { buildConnectedBankCard } from "./connectedBankCard";
import {
  buildAvailabilityBankCard,
  buildErroredBankCard,
  buildLinkingBankCard
} from "./bankCardStates";

export function buildBankCards(input: {
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

    return buildEnableBankingCard(bank, input);
  });
}

function buildEnableBankingCard(
  bank: (typeof BANKS)[number],
  input: Parameters<typeof buildBankCards>[0]
): BankInstitutionCard {
  const connection = getMatchingConnection(bank.name, input.connectionsResult);

  if (connection?.status === "linked") {
    return buildConnectedBankCard(bank, connection);
  }

  if (connection?.status === "linking") {
    return buildLinkingBankCard(bank, connection);
  }

  if (connection?.status === "error") {
    return buildErroredBankCard(bank, connection);
  }

  return buildAvailabilityBankCard(bank, input);
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
