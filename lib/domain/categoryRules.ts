import type {
  CategoryRule,
  CategoryRuleCondition,
  CategoryRuleInput,
  CategoryRuleTransaction
} from "@/definitions";

export function normalizeRuleText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchesCategoryRule(
  rule: CategoryRuleCondition,
  row: CategoryRuleTransaction
): boolean {
  const text = normalizeRuleText(row[rule.field] ?? "");
  const value = normalizeRuleText(rule.value);
  const amount = Number(row.amount);
  return (
    Boolean(value && text) &&
    row.currency === rule.currency &&
    (rule.account_id === null || row.account_id === rule.account_id) &&
    Number.isFinite(amount) &&
    amount !== 0 &&
    (amount > 0 ? "income" : "expense") === rule.direction &&
    (rule.operator === "equals" ? text === value : text.includes(value))
  );
}

export type CategoryRuleDecision =
  | { kind: "none" }
  | { kind: "conflict" }
  | { kind: "assign"; rule: CategoryRule };

export function evaluateCategoryRules(
  row: CategoryRuleTransaction,
  rules: CategoryRule[]
): CategoryRuleDecision {
  if (
    row.excluded ||
    row.booking_status !== "booked" ||
    !row.booking_date ||
    row.category_id !== null ||
    row.category_source !== null
  )
    return { kind: "none" };
  const matches = rules.filter(
    (rule) =>
      rule.status === "active" &&
      rule.category_id &&
      rule.activated_at &&
      Date.parse(row.first_seen_at) >= Date.parse(rule.activated_at) &&
      row.booking_date! >=
        new Date(rule.activated_at).toISOString().slice(0, 10) &&
      matchesCategoryRule(rule, row)
  );
  if (!matches.length) return { kind: "none" };
  if (new Set(matches.map((rule) => rule.category_id)).size > 1)
    return { kind: "conflict" };
  matches.sort(
    (a, b) =>
      a.activated_at!.localeCompare(b.activated_at!) || a.id.localeCompare(b.id)
  );
  return { kind: "assign", rule: matches[0] };
}

export const RULE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCategoryRuleInput(
  value: unknown
): value is CategoryRuleInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    ["merchant_name", "counterparty_name", "description"].includes(
      String(v.field)
    ) &&
    (v.operator === "equals" ||
      (v.operator === "contains" && v.field === "description")) &&
    typeof v.value === "string" &&
    normalizeRuleText(v.value).length >= 1 &&
    v.value.length <= 300 &&
    typeof v.currency === "string" &&
    /^[A-Z]{3}$/.test(v.currency) &&
    (v.direction === "income" || v.direction === "expense") &&
    (v.account_id === null ||
      (typeof v.account_id === "string" &&
        RULE_UUID_PATTERN.test(v.account_id))) &&
    typeof v.category_id === "string" &&
    RULE_UUID_PATTERN.test(v.category_id) &&
    (v.status === "active" || v.status === "paused") &&
    (v.id === undefined ||
      (typeof v.id === "string" &&
        RULE_UUID_PATTERN.test(v.id) &&
        Number.isSafeInteger(v.version) &&
        Number(v.version) > 0))
  );
}
