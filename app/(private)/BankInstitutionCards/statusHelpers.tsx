import {
  CheckCircle2Icon,
  CircleAlertIcon,
  LinkIcon,
  TimerResetIcon
} from "lucide-react";

import { Spinner } from "@/components/ui/Spinner";
import type { BankInstitutionCard } from "@/definitions";

export function canStartConnection(
  card: BankInstitutionCard
): card is BankInstitutionCard & {
  aspspName: string;
  country: string;
} {
  return (
    card.provider === "enable_banking" &&
    (card.state === "idle" ||
      card.state === "error" ||
      card.state === "stale-linking") &&
    Boolean(card.aspspName) &&
    Boolean(card.country)
  );
}

export function getConnectionActionLabel(card: BankInstitutionCard): string {
  if (card.state === "error" || card.state === "stale-linking") {
    return `Reintentar conexión con ${card.name}. ${card.tooltip}`;
  }

  return `Conectar ${card.name} con Enable Banking.`;
}

export function getConnectionActionIcon(card: BankInstitutionCard) {
  if (card.state === "stale-linking") {
    return <TimerResetIcon className="size-7" aria-hidden />;
  }

  return <LinkIcon className="size-7" aria-hidden />;
}

export function getStatusIcon(state: BankInstitutionCard["state"]) {
  if (state === "loading" || state === "linking") {
    return <Spinner className="size-7" aria-hidden />;
  }

  if (state === "stale-linking") {
    return <TimerResetIcon className="size-7" aria-hidden />;
  }

  if (state === "connected" || state === "idle") {
    return <CheckCircle2Icon className="size-7" aria-hidden />;
  }

  return <CircleAlertIcon className="size-7" aria-hidden />;
}
