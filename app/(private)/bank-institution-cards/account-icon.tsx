import { Tooltip } from "@/components/ui/tooltip";
import type { BankInstitutionCard } from "@/definitions";

import { getAccountTypeIcon } from "./account-type-icon";

type Account = NonNullable<BankInstitutionCard["accounts"]>[number];

export function AccountIcon({ account }: { account: Account }) {
  const label = account.ibanLast4
    ? `${account.name}. Cuenta terminada en ${account.ibanLast4}.`
    : account.name;

  return (
    <Tooltip
      triggerLabel={label}
      label={label}
      triggerClassName="size-auto border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-transparent focus-visible:ring-ring/20"
    >
      {getAccountTypeIcon(account)}
    </Tooltip>
  );
}
