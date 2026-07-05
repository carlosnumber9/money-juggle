import "server-only";

import { demoBankingDataSource } from "@/lib/data/banking-data-source.demo";
import { realBankingDataSource } from "@/lib/data/banking-data-source.real";
import { isDemoMode } from "@/lib/demo/mode";

export function getBankingDataSource() {
  if (isDemoMode()) {
    return demoBankingDataSource;
  }

  return realBankingDataSource;
}
