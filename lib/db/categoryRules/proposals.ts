import "server-only";
import { createHash } from "node:crypto";
import type { RuleProposal } from "@/lib/domain/categoryRuleDiscovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function persistRuleProposals(
  userId: string,
  proposals: RuleProposal[]
): Promise<number> {
  const db = await createSupabaseServerClient();
  let inserted = 0;
  for (let offset = 0; offset < proposals.length; offset += 100) {
    const values = proposals.slice(offset, offset + 100).map((proposal) => ({
      ...proposal.condition,
      name: proposal.condition.value,
      user_id: userId,
      category_id: proposal.categoryId,
      status: "proposed",
      evidence: proposal.evidence,
      proposal_key: createHash("sha256")
        .update(JSON.stringify(proposal.condition))
        .digest("hex")
    }));
    const { data, error } = await db
      .from("category_rules")
      .upsert(values, {
        onConflict: "user_id,proposal_key",
        ignoreDuplicates: true
      })
      .select("id");
    if (error) throw new Error("Could not persist rule proposals.");
    inserted += data?.length ?? 0;
  }
  return inserted;
}
