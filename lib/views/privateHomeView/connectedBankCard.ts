import type {
  BANKS,
  BankConnectionSummary,
  BankInstitutionCard
} from "@/definitions";

import { buildBalanceTotals } from "./balanceTotals";

export function buildConnectedBankCard(
  bank: (typeof BANKS)[number],
  connection: BankConnectionSummary
): BankInstitutionCard {
  return {
    ...bank,
    state: "connected",
    tooltip: `${bank.name} conectado correctamente.`,
    balanceTotals: buildBalanceTotals(connection),
    accounts: connection.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      ibanLast4: account.iban_last4,
      accountType: account.account_type,
      latestBalance: account.latest_balance
        ? {
            amount: account.latest_balance.amount,
            currency: account.latest_balance.currency,
            balanceType: account.latest_balance.balance_type,
            referenceDate: account.latest_balance.reference_date,
            fetchedAt: account.latest_balance.fetched_at
          }
        : null
    }))
  };
}
