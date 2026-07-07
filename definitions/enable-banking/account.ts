export type EnableBankingAccountResource = {
  uid: string;
  account_id?: {
    iban?: string;
    other?: {
      identification?: string;
      scheme_name?: string;
    };
  };
  all_account_ids?: Array<{
    identification?: string;
    scheme_name?: string;
  }>;
  name?: string;
  details?: string;
  cash_account_type?: string;
  product?: string;
  currency?: string;
  psu_status?: string;
  identification_hash?: string;
  identification_hashes?: string[];
};
