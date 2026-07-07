import type { BankInstitutionCard } from "@/definitions";

const BASE_STATUS_CLASS =
  "size-auto border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-ring/30";

export function getStatusToneClass(state: BankInstitutionCard["state"]) {
  if (state === "connected" || state === "idle") {
    return `${BASE_STATUS_CLASS} text-primary`;
  }

  if (state === "loading" || state === "linking") {
    return `${BASE_STATUS_CLASS} text-muted-foreground`;
  }

  if (state === "stale-linking") {
    return `${BASE_STATUS_CLASS} text-primary`;
  }

  return `${BASE_STATUS_CLASS} text-destructive`;
}
