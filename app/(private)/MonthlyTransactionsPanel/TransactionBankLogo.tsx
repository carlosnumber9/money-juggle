import type { MonthlyTransactionSummary } from "@/definitions";

import {
  getInstitutionLogo,
  type InstitutionLogoStyle
} from "./institutionLogo";

export function TransactionBankLogo({
  transaction
}: {
  transaction: MonthlyTransactionSummary;
}) {
  const logo = getInstitutionLogo(transaction);

  return (
    <span
      aria-hidden
      className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-border bg-transparent"
      title={logo.label}
    >
      {logo.path ? (
        <span
          className="monthly-transaction-bank-logo"
          style={
            {
              "--institution-logo": `url(${logo.path})`,
              "--institution-logo-color": logo.color
            } as InstitutionLogoStyle
          }
        />
      ) : (
        <span className="text-[0.625rem] font-medium text-muted-foreground">
          {logo.fallback}
        </span>
      )}
    </span>
  );
}
