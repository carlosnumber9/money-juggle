import type { EnableBankingAccountResource } from "@/definitions";

export function mapEnableBankingAccountToRow({
  userId,
  bankConnectionId,
  account
}: {
  userId: string;
  bankConnectionId: string;
  account: EnableBankingAccountResource;
}) {
  const iban = account.account_id?.iban;
  const ibanLast4 = getLast4(iban);
  const name =
    account.name ?? account.details ?? account.product ?? fallbackName(account);

  return {
    user_id: userId,
    bank_connection_id: bankConnectionId,
    provider_account_id: account.uid,
    name,
    iban_last4: ibanLast4,
    currency: getCurrency(account.currency),
    account_type: account.cash_account_type ?? account.product ?? null,
    status: "active"
  };
}

function getLast4(value: string | undefined): string | null {
  const normalized = value?.replace(/[^A-Za-z0-9]/g, "");

  if (!normalized || normalized.length < 4) {
    return null;
  }

  return normalized.slice(-4);
}

function getCurrency(value: string | undefined): string {
  if (value && /^[A-Z]{3}$/.test(value)) {
    return value;
  }

  return "EUR";
}

function fallbackName(account: EnableBankingAccountResource): string {
  const ibanLast4 = getLast4(account.account_id?.iban);

  if (ibanLast4) {
    return `Account ${ibanLast4}`;
  }

  return `Account ${account.uid.slice(0, 8)}`;
}
