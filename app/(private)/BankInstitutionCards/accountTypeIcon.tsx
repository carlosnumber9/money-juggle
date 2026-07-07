import {
  BriefcaseBusinessIcon,
  CircleDollarSignIcon,
  PiggyBankIcon,
  WalletCardsIcon
} from "lucide-react";

import type { BankInstitutionCard } from "@/definitions";

type Account = NonNullable<BankInstitutionCard["accounts"]>[number];

export function getAccountTypeIcon({ accountType, name }: Account) {
  const normalizedType = accountType?.toLowerCase() ?? "";
  const normalizedName = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizedType.includes("savings") || normalizedType.includes("svgs")) {
    return <PiggyBankIcon className="size-4" aria-hidden />;
  }

  if (normalizedName.includes("ahorro")) {
    return <PiggyBankIcon className="size-4" aria-hidden />;
  }

  if (normalizedName.includes("nomina")) {
    return <BriefcaseBusinessIcon className="size-4" aria-hidden />;
  }

  if (normalizedType.includes("current") || normalizedType.includes("cacc")) {
    return <WalletCardsIcon className="size-4" aria-hidden />;
  }

  return <CircleDollarSignIcon className="size-4" aria-hidden />;
}
