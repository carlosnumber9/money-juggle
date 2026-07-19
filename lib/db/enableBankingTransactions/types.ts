import type {
  EnableBankingTransactionResource,
  MonthlyTransactionSummary
} from "@/definitions";

export type StoredAccountForTransactionSync = {
  id: string;
  provider_account_id: string;
  name: string;
  iban_last4: string | null;
  iban_fingerprint: string | null;
};

export type StoredConnectionForTransactionSync = {
  id: string;
  user_id: string;
  status: string;
  provider_session_id: string | null;
  accounts: StoredAccountForTransactionSync[];
};

export type TransactionRow = {
  user_id: string;
  account_id: string;
  stable_import_key: string;
  identity_source: string;
  provider: string;
  provider_transaction_id: string | null;
  provider_internal_transaction_id: string | null;
  entry_reference: string | null;
  end_to_end_id: string | null;
  deduplication_fingerprint: string | null;
  booking_status: "booked" | "pending" | "information";
  booking_date: string | null;
  booking_datetime: string | null;
  value_date: string | null;
  value_datetime: string | null;
  amount: string;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  counterparty_name: string | null;
  counterparty_account_last4: string | null;
  counterparty_account_fingerprint: string | null;
  bank_transaction_code: string | null;
  merchant_category_code: string | null;
};

export type TransactionMapperInput = {
  userId: string;
  account: StoredAccountForTransactionSync;
  transaction: EnableBankingTransactionResource;
};

export type TransactionSyncResult = {
  synced: boolean;
  attemptedAccountCount: number;
  succeededAccountCount: number;
  failedAccountCount: number;
};

export type TransactionSyncMode = "incremental" | "backfill";

export type StoredMonthlyTransactionRow = {
  id: string;
  account_id: string;
  booking_status: MonthlyTransactionSummary["booking_status"];
  booking_date: string | null;
  amount: string | number;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  counterparty_name: string | null;
  counterparty_account_last4: string | null;
  counterparty_account_fingerprint: string | null;
  category_id: string | null;
  transaction_categories:
    | StoredMonthlyTransactionCategory
    | StoredMonthlyTransactionCategory[]
    | null;
  transaction_label_assignments:
    | StoredMonthlyTransactionLabelAssignment
    | StoredMonthlyTransactionLabelAssignment[]
    | null;
  accounts: StoredMonthlyTransactionAccount | StoredMonthlyTransactionAccount[];
};

type StoredMonthlyTransactionLabelAssignment = {
  created_at: string;
  transaction_labels:
    StoredMonthlyTransactionLabel | StoredMonthlyTransactionLabel[] | null;
};

type StoredMonthlyTransactionLabel = {
  id: string;
  name: string;
};

export type StoredOwnAccountForTransferMatching = {
  id: string;
  iban_last4: string | null;
  iban_fingerprint: string | null;
};

type StoredMonthlyTransactionAccount = {
  id: string;
  name: string;
  iban_last4: string | null;
  iban_fingerprint: string | null;
  bank_connections:
    | StoredMonthlyTransactionBankConnection
    | StoredMonthlyTransactionBankConnection[];
};

type StoredMonthlyTransactionBankConnection = {
  institutions:
    StoredMonthlyTransactionInstitution | StoredMonthlyTransactionInstitution[];
};

type StoredMonthlyTransactionInstitution = {
  provider_institution_id: string;
  name: string;
};

type StoredMonthlyTransactionCategory = {
  id: string;
  name: string;
  slug: string;
  transaction_category_groups:
    | StoredMonthlyTransactionCategoryGroup
    | StoredMonthlyTransactionCategoryGroup[]
    | null;
};

type StoredMonthlyTransactionCategoryGroup = {
  id: string;
  name: string;
};
