export type EnableBankingTransactionResource = {
  uid?: unknown;
  transaction_id?: unknown;
  internal_transaction_id?: unknown;
  entry_reference?: unknown;
  end_to_end_id?: unknown;
  booking_status?: unknown;
  status?: unknown;
  booking_date?: unknown;
  booking_date_time?: unknown;
  value_date?: unknown;
  value_date_time?: unknown;
  transaction_amount?: EnableBankingAmount;
  amount?: EnableBankingAmount;
  credit_debit_indicator?: unknown;
  remittance_information?: unknown[];
  remittance_information_unstructured?: unknown;
  description?: unknown;
  merchant_name?: unknown;
  creditor_name?: unknown;
  debtor_name?: unknown;
  counterparty_name?: unknown;
  creditor_account?: EnableBankingCounterpartyAccount;
  debtor_account?: EnableBankingCounterpartyAccount;
  bank_transaction_code?: unknown;
  merchant_category_code?: unknown;
};

type EnableBankingAmount = {
  currency?: string | number;
  amount?: string | number;
};

type EnableBankingCounterpartyAccount = {
  iban?: string;
  other?: {
    identification?: string;
  };
};

export type EnableBankingTransactionsResponse =
  | {
      transactions: EnableBankingTransactionResource[];
      continuation_key?: string | null;
    }
  | EnableBankingTransactionResource[];

export type EnableBankingTransactionsResult = {
  transactions: EnableBankingTransactionResource[];
  paginationTruncated: boolean;
};

export type EnableBankingTransactionsFetchStrategy = "default" | "longest";
