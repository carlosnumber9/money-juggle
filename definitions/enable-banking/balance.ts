export type EnableBankingBalanceResource = {
  name: string;
  balance_amount: {
    currency: string;
    amount: string;
  };
  balance_type: string;
  last_change_date_time?: string;
  reference_date?: string;
  last_committed_transaction?: string;
};

export type EnableBankingBalancesResponse = {
  balances: EnableBankingBalanceResource[];
};
