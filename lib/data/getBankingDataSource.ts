import "server-only";

import type { BankingDataSource } from "@/definitions";
import { demoBankingDataSource } from "@/lib/data/bankingDataSource.demo";
import { realBankingDataSource } from "@/lib/data/bankingDataSource.real";
import { isDemoMode } from "@/lib/demo/mode";

export function getBankingDataSource(): BankingDataSource {
  if (isDemoMode()) {
    return demoBankingDataSource;
  }

  return realBankingDataSource;
}
