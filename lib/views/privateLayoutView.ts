import "server-only";

import type { PrivateLayoutView } from "@/definitions";
import { bankingDataSource } from "@/lib/data/bankingDataSource";

export async function getPrivateLayoutView(): Promise<PrivateLayoutView> {
  const user = await bankingDataSource.getCurrentUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  if (!user.isAllowed) {
    return { kind: "forbidden" };
  }

  return {
    kind: "authenticated",
    user: {
      email: user.email
    }
  };
}
