import type {
  CategoryRuleCondition,
  CategoryRuleEvidence,
  CategoryRuleTransaction
} from "@/definitions";
import { matchesCategoryRule, normalizeRuleText } from "./categoryRules";
export type RuleProposal = {
  condition: CategoryRuleCondition;
  categoryId: string | null;
  evidence: CategoryRuleEvidence;
};
export function ruleDiscoveryText(row: CategoryRuleTransaction): string {
  return normalizeRuleText(
    row.description || row.merchant_name || row.counterparty_name || ""
  ).slice(0, 300);
}
export function buildRuleProposals(
  rows: CategoryRuleTransaction[],
  embeddings: Map<string, number[]>,
  modelRevision: string,
  deadline: number = Infinity
): RuleProposal[] {
  const candidates = rows.filter(
    (row) =>
      !row.excluded &&
      row.booking_status === "booked" &&
      row.booking_date &&
      row.category_source !== "rule" &&
      Number(row.amount) !== 0 &&
      embeddings.has(ruleDiscoveryText(row))
  );
  const clusters: Array<{
    anchor: number[];
    key: string;
    rows: CategoryRuleTransaction[];
  }> = [];
  for (const row of candidates) {
    if (Date.now() >= deadline)
      throw new Error("Discovery time budget exceeded.");
    const vector = embeddings.get(ruleDiscoveryText(row))!;
    const key = `${row.currency}:${Number(row.amount) > 0 ? "income" : "expense"}`;
    let cluster = clusters.find(
      (group) => group.key === key && cosine(vector, group.anchor) >= 0.9
    );
    if (!cluster) {
      cluster = { anchor: vector, key, rows: [] };
      clusters.push(cluster);
    }
    cluster.rows.push(row);
  }
  const proposals = new Map<string, RuleProposal>();
  for (const cluster of clusters) {
    if (Date.now() >= deadline)
      throw new Error("Discovery time budget exceeded.");
    const condition = stableCondition(cluster.rows);
    if (!condition) continue;
    const matches = rows.filter(
      (row) =>
        !row.excluded &&
        row.booking_status === "booked" &&
        row.booking_date &&
        row.category_source !== "rule" &&
        matchesCategoryRule(condition, row)
    );
    const months = new Set(matches.map((row) => row.booking_date!.slice(0, 7)))
      .size;
    const manual = matches.filter(
      (row) => row.category_source !== "rule" && row.category_id !== null
    );
    const categoryIds = [...new Set(manual.map((row) => row.category_id!))];
    if (months < 3 || categoryIds.length === 0) continue;
    const key = JSON.stringify(condition);
    proposals.set(key, {
      condition,
      categoryId: categoryIds.length === 1 ? categoryIds[0] : null,
      evidence: {
        transactionIds: matches.slice(0, 100).map((row) => row.id),
        examples: matches.slice(0, 8).map((row) => ({
          description:
            row.description ||
            row.merchant_name ||
            row.counterparty_name ||
            "Movimiento",
          date: row.booking_date!,
          categoryId: row.category_id
        })),
        categoryIds,
        months,
        modelRevision
      }
    });
  }
  return [...proposals.values()];
}
function stableCondition(
  rows: CategoryRuleTransaction[]
): CategoryRuleCondition | null {
  const base = {
    currency: rows[0].currency,
    direction:
      Number(rows[0].amount) > 0 ? ("income" as const) : ("expense" as const),
    account_id: null
  };
  for (const field of [
    "merchant_name",
    "counterparty_name",
    "description"
  ] as const) {
    const value = normalizeRuleText(rows[0][field] ?? "");
    if (
      value &&
      value.length <= 300 &&
      rows.every((row) => normalizeRuleText(row[field] ?? "") === value)
    )
      return { ...base, field, operator: "equals", value };
  }
  const descriptions = rows.map((row) =>
    normalizeRuleText(row.description ?? "")
  );
  if (descriptions.some((text) => !text)) return null;
  const tokens = descriptions[0].split(" ").slice(0, 60);
  for (let length = tokens.length; length >= 2; length--) {
    for (let start = 0; start + length <= tokens.length; start++) {
      const value = tokens.slice(start, start + length).join(" ");
      if (
        value.length <= 300 &&
        descriptions.every((text) => text.includes(value))
      )
        return { ...base, field: "description", operator: "contains", value };
    }
  }
  return null;
}
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let result = 0;
  for (let i = 0; i < a.length; i++) result += a[i] * b[i];
  return result;
}
