import "server-only";
import type { CategoryRuleCoverage } from "@/definitions";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import {
  buildRuleProposals,
  ruleDiscoveryText
} from "@/lib/domain/categoryRuleDiscovery";
import { persistRuleProposals } from "@/lib/db/categoryRules/proposals";
import { embedCategoryRuleTexts } from "./minilm";
import manifest from "./minilmManifest.json";
export async function discoverCategoryRules(
  userId: string,
  now: Date
): Promise<CategoryRuleCoverage> {
  const deadline = Date.now() + 110000;
  const fromDate = new Date(now);
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - 1);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const range = {
    from: fromDate.toISOString().slice(0, 10),
    to: tomorrow.toISOString().slice(0, 10)
  };
  const history = await bankingDataSource.listCategoryRuleHistory(
    userId,
    range
  );
  const allTexts = [
    ...new Set(
      history.rows
        .filter((row) => !row.excluded && row.category_source !== "rule")
        .map(ruleDiscoveryText)
        .filter(Boolean)
    )
  ];
  const texts = allTexts.slice(0, 2000);
  const vectors = texts.length
    ? await embedCategoryRuleTexts(texts, deadline)
    : [];
  const proposals = buildRuleProposals(
    history.rows,
    new Map(texts.map((text, index) => [text, vectors[index]])),
    manifest.revision,
    deadline
  );
  if (Date.now() >= deadline)
    throw new Error("Discovery time budget exceeded.");
  const inserted = await persistRuleProposals(userId, proposals);
  return {
    ...range,
    rows: history.rows.length,
    texts: texts.length,
    truncated: history.truncated || allTexts.length > 2000,
    proposals: inserted
  };
}
