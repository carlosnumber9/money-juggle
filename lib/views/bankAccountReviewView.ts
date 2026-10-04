import "server-only";

import { bankingDataSource } from "@/lib/data/bankingDataSource";

export async function getBankAccountReviewView(bankConnectionId: string) {
  const user = await bankingDataSource.getCurrentUser();
  if (!user || !user.isAllowed) return null;
  return bankingDataSource.getBankAccountReview(user.id, bankConnectionId);
}
