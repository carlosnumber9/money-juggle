export type CategoryRuleField =
  "merchant_name" | "counterparty_name" | "description";
export type CategoryRuleStatus =
  "proposed" | "active" | "paused" | "dismissed" | "deleted";
export type CategoryRuleCondition = {
  field: CategoryRuleField;
  operator: "equals" | "contains";
  value: string;
  currency: string;
  direction: "income" | "expense";
  account_id: string | null;
};
export type CategoryRuleEvidence = {
  transactionIds: string[];
  examples: Array<{
    description: string;
    date: string;
    categoryId: string | null;
  }>;
  categoryIds: string[];
  months: number;
  modelRevision: string;
};
export type CategoryRule = CategoryRuleCondition & {
  id: string;
  user_id: string;
  category_id: string | null;
  status: CategoryRuleStatus;
  activated_at: string | null;
  version: number;
  proposal_key: string | null;
  evidence: CategoryRuleEvidence | null;
  created_at: string;
};
export type CategoryRuleInput = CategoryRuleCondition & {
  id?: string;
  version?: number;
  category_id: string;
  status: "active" | "paused";
};
export type CategoryRuleTransaction = {
  id: string;
  account_id: string;
  booking_status: "booked" | "pending" | "information";
  booking_date: string | null;
  first_seen_at: string;
  amount: string | number;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  counterparty_name: string | null;
  category_id: string | null;
  category_source: "manual" | "rule" | null;
  excluded: boolean;
};
export type CategoryRuleCoverage = {
  from: string;
  to: string;
  rows: number;
  texts: number;
  truncated: boolean;
  proposals: number;
};
export type CategoryRuleSettings = {
  rules: CategoryRule[];
  categories: import("./dataSource").TransactionCategoryGroupSummary[];
  accounts: Array<{ id: string; name: string; currency: string }>;
  conflicts: Array<{
    id: string;
    description: string | null;
    booking_date: string | null;
    currency: string;
  }>;
  error: string | null;
};
