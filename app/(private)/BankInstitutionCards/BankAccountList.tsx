import type { BankInstitutionCard } from "@/definitions";

import { AccountIcon } from "./AccountIcon";
import { AnimatedCurrency } from "./AnimatedCurrency";

export function BankAccountList({ card }: { card: BankInstitutionCard }) {
  if (card.state !== "connected" || !card.accounts?.length) {
    return null;
  }

  return (
    <ul className="space-y-1 text-xs">
      {card.accounts.map((account) => (
        <li key={account.id} className="flex min-w-0 items-center gap-2 py-1">
          <AccountIcon account={account} />
          <span className="font-medium">
            {account.latestBalance ? (
              <AnimatedCurrency
                amount={account.latestBalance.amount}
                currency={account.latestBalance.currency}
              />
            ) : (
              "Sin saldo"
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
