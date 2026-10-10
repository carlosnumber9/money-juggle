import "server-only";
import type {
  PortfolioSnapshot,
  PortfolioSnapshotSummary
} from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PortfolioImportError } from "./imports";

export type StoredPortfolioSummary = {
  id: string;
  report_date: string;
  currency: string;
  cash: string;
  investments: string;
  revision: string;
};
export function mapPortfolioSummary(
  data: StoredPortfolioSummary
): PortfolioSnapshotSummary {
  return {
    id: data.id,
    reportDate: data.report_date,
    currency: "EUR",
    cash: data.cash,
    investments: data.investments,
    revision: data.revision
  };
}

export async function getLatestPortfolioSnapshot(
  userId: string
): Promise<PortfolioSnapshot | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("portfolio_snapshot_values")
    .select("id, report_date, currency, cash, investments, revision")
    .eq("user_id", userId)
    .eq("platform", "trade-republic")
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new PortfolioImportError("unavailable");
  if (!data) return null;
  const { data: positions, error: positionError } = await client
    .from("portfolio_position_values")
    .select("name, isin, quantity, price, price_date, value")
    .eq("user_id", userId)
    .eq("snapshot_id", data.id)
    .order("isin");
  if (positionError) throw new PortfolioImportError("unavailable");
  return {
    ...mapPortfolioSummary(data as StoredPortfolioSummary),
    positions: (positions ?? []).map((row) => ({
      name: row.name,
      isin: row.isin,
      quantity: row.quantity,
      price: row.price,
      priceDate: row.price_date,
      value: row.value
    }))
  };
}

export async function listPortfolioHistory(
  userId: string
): Promise<PortfolioSnapshotSummary[]> {
  const client = await createSupabaseServerClient();
  const result: PortfolioSnapshotSummary[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("portfolio_snapshot_values")
      .select("id, report_date, currency, cash, investments, revision")
      .eq("user_id", userId)
      .eq("platform", "trade-republic")
      .order("report_date", { ascending: true })
      .range(offset, offset + 499);
    if (error) throw new PortfolioImportError("unavailable");
    const page = (data ?? []) as StoredPortfolioSummary[];
    result.push(...page.map(mapPortfolioSummary));
    if (page.length < 500) return result;
  }
}
