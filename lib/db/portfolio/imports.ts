import "server-only";
import type {
  PortfolioExtraction,
  PortfolioImportDraft,
  PortfolioSnapshotSummary,
  PortfolioValues
} from "@/definitions";
import { validatePortfolioValues } from "@/lib/domain/portfolio/values";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class PortfolioImportError extends Error {
  constructor(public readonly reason: "expired" | "conflict" | "unavailable") {
    super("Portfolio import failed.");
  }
}

export async function createPortfolioDraft(
  userId: string,
  original: PortfolioExtraction,
  sourceHash: string,
  parserVersion: string
): Promise<PortfolioImportDraft> {
  const client = await createSupabaseServerClient();
  const { error: cleanupError } = await client
    .from("portfolio_import_drafts")
    .delete()
    .eq("user_id", userId)
    .lte("expires_at", new Date().toISOString());
  if (cleanupError) throw new PortfolioImportError("unavailable");
  const { data, error } = await client
    .from("portfolio_import_drafts")
    .insert({
      user_id: userId,
      original_values: original,
      source_hash: sourceHash,
      parser_version: parserVersion
    })
    .select("id, expires_at")
    .single();
  if (error || !data) throw new PortfolioImportError("unavailable");
  return { id: data.id, expiresAt: data.expires_at, original };
}

export async function getPortfolioDraft(
  userId: string,
  id: string
): Promise<PortfolioImportDraft | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("portfolio_import_drafts")
    .select("id, expires_at, original_values")
    .eq("user_id", userId)
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .is("confirmed_snapshot_id", null)
    .maybeSingle();
  if (error) throw new PortfolioImportError("unavailable");
  return data
    ? {
        id: data.id,
        expiresAt: data.expires_at,
        original: data.original_values as PortfolioExtraction
      }
    : null;
}

export async function getPortfolioSnapshotForDate(
  userId: string,
  reportDate: string
): Promise<PortfolioSnapshotSummary | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("portfolio_snapshot_values")
    .select("id, report_date, currency, cash, investments, revision")
    .eq("user_id", userId)
    .eq("platform", "trade-republic")
    .eq("report_date", reportDate)
    .maybeSingle();
  if (error) throw new PortfolioImportError("unavailable");
  return data
    ? {
        id: data.id,
        reportDate: data.report_date,
        currency: "EUR",
        cash: String(data.cash),
        investments: String(data.investments),
        revision: data.revision
      }
    : null;
}

export async function confirmPortfolioImport(input: {
  draftId: string;
  values: PortfolioValues;
  expectedRevision: string | null;
  replace: boolean;
}): Promise<string> {
  const values = validatePortfolioValues(input.values);
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("confirm_portfolio_import", {
    p_draft_id: input.draftId,
    p_values: values,
    p_expected_revision: input.expectedRevision,
    p_replace: input.replace
  });
  if (error || typeof data !== "string")
    throw new PortfolioImportError(
      error?.code === "40001"
        ? "conflict"
        : error?.code === "P0002"
          ? "expired"
          : "unavailable"
    );
  return data;
}
