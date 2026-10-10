import "server-only";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import type { PortfolioImportReview } from "@/definitions";

export async function getPortfolioImportView(
  draftId: string
): Promise<PortfolioImportReview | null> {
  const user = await bankingDataSource.getCurrentUser();
  if (!user || !user.isAllowed || !/^[a-f0-9-]{36}$/i.test(draftId))
    return null;
  const draft = await bankingDataSource.getPortfolioImportDraft(
    user.id,
    draftId
  );
  if (!draft) return null;
  return {
    draft,
    existing: await bankingDataSource.getPortfolioSnapshotForDate(
      user.id,
      draft.original.reportDate
    )
  };
}
