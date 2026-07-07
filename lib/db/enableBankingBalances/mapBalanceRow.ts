import type { EnableBankingBalanceResource } from "@/definitions";

export function mapBalanceToRow({
  userId,
  accountId,
  accountCurrency,
  balance,
  fetchedAt
}: {
  userId: string;
  accountId: string;
  accountCurrency: string;
  balance: EnableBankingBalanceResource;
  fetchedAt: string;
}) {
  return {
    user_id: userId,
    account_id: accountId,
    balance_type: balance.balance_type,
    amount: balance.balance_amount.amount,
    currency: getCurrency(balance.balance_amount.currency, accountCurrency),
    reference_date: balance.reference_date ?? null,
    fetched_at: fetchedAt
  };
}

function getCurrency(value: string | undefined, fallback: string): string {
  if (value && /^[A-Z]{3}$/.test(value)) {
    return value;
  }

  return fallback;
}
