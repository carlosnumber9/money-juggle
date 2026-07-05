import "server-only";

import { getBankingDataSource } from "@/lib/data/get-banking-data-source";
import { isDemoMode } from "@/lib/demo/mode";

export type PrivateLayoutView =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "authenticated";
      isDemo: boolean;
      user: {
        email: string | null;
      };
    };

export async function getPrivateLayoutView(): Promise<PrivateLayoutView> {
  const dataSource = getBankingDataSource();
  const user = await dataSource.getCurrentUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  if (!user.isAllowed) {
    return { kind: "forbidden" };
  }

  return {
    kind: "authenticated",
    isDemo: isDemoMode(),
    user: {
      email: user.email
    }
  };
}
