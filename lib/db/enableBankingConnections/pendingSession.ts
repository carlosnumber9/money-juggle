import "server-only";

import { randomUUID } from "node:crypto";
import type { EnableBankingAuthorizeSessionResponse } from "@/definitions";
import { mapEnableBankingAccountToRow } from "./accountRow";

export type AccountIdentifiers = {
  iban_fingerprint: string | null;
  iban_last4: string | null;
};
export type PendingReconnection = {
  reviewId: string;
  expiresAt: string;
  session: EnableBankingAuthorizeSessionResponse;
  identifiers: AccountIdentifiers[];
};

export function preparePendingReconnection(
  input: {
    userId: string;
    bankConnectionId: string;
    session: EnableBankingAuthorizeSessionResponse;
  },
  now = new Date()
): PendingReconnection {
  return {
    reviewId: randomUUID(),
    expiresAt: new Date(
      Math.min(
        now.getTime() + 15 * 60_000,
        Date.parse(input.session.access.valid_until)
      )
    ).toISOString(),
    identifiers: input.session.accounts.map((account) => {
      const row = mapEnableBankingAccountToRow({ ...input, account });
      return {
        iban_fingerprint: row.iban_fingerprint,
        iban_last4: row.iban_last4
      };
    }),
    session: {
      session_id: input.session.session_id,
      aspsp: input.session.aspsp,
      access: input.session.access,
      psu_type: input.session.psu_type,
      accounts: input.session.accounts.map((account) => ({
        uid: account.uid,
        name: account.name,
        product: account.product,
        currency: account.currency,
        cash_account_type: account.cash_account_type,
        identification_hash: account.identification_hash,
        identification_hashes: account.identification_hashes
      }))
    }
  };
}

export function readPendingReconnection(
  value: unknown,
  now = new Date()
): PendingReconnection | null {
  if (!value || typeof value !== "object") return null;
  const pending = value as PendingReconnection;
  if (
    typeof pending.reviewId !== "string" ||
    !Number.isFinite(Date.parse(pending.expiresAt)) ||
    Date.parse(pending.expiresAt) <= now.getTime() ||
    !pending.session?.session_id ||
    !pending.session.aspsp?.name ||
    !pending.session.aspsp.country ||
    !Number.isFinite(Date.parse(pending.session.access?.valid_until)) ||
    Date.parse(pending.session.access.valid_until) <= now.getTime() ||
    !Array.isArray(pending.session.accounts) ||
    pending.session.accounts.length === 0 ||
    !Array.isArray(pending.identifiers) ||
    pending.identifiers.length !== pending.session.accounts.length ||
    pending.session.accounts.some(
      (account) => !account || typeof account.uid !== "string" || !account.uid
    ) ||
    pending.identifiers.some(
      (item) =>
        !item ||
        (item.iban_fingerprint !== null &&
          (typeof item.iban_fingerprint !== "string" ||
            !/^[a-f0-9]{64}$/.test(item.iban_fingerprint))) ||
        (item.iban_last4 !== null &&
          (typeof item.iban_last4 !== "string" ||
            !/^[A-Za-z0-9]{4}$/.test(item.iban_last4)))
    )
  )
    return null;
  return pending;
}
