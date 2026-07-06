"use client";

import {
  BriefcaseBusinessIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  LinkIcon,
  PiggyBankIcon,
  TimerResetIcon,
  WalletCardsIcon
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import type {
  BankInstitutionCard,
  BankInstitutionCardsProps
} from "@/definitions";

export function BankInstitutionCards({ cards }: BankInstitutionCardsProps) {
  return (
    <section
      className="mt-8 grid w-full grid-cols-3 gap-4 max-sm:grid-cols-1"
      aria-label="Entidades bancarias"
    >
      {cards.map((card) => (
        <Card
          key={card.slug}
          className="relative min-h-[clamp(160px,18vw,240px)] overflow-hidden p-0"
        >
          <Image
            src={card.logoPath}
            alt=""
            width={420}
            height={220}
            aria-hidden
            className="pointer-events-none absolute top-[56%] left-1/2 z-0 w-[210%] -translate-x-1/2 -translate-y-1/2 scale-[1.65] opacity-10"
          />
          <CardContent className="relative z-10 flex min-h-[clamp(160px,18vw,240px)] items-start p-4 text-left">
            <div className="flex min-h-full w-full flex-col justify-between gap-5">
              <div className="min-w-0 pr-9">
                <span className="block truncate text-base font-semibold">
                  {card.name}
                </span>
                <BankBalanceSummary card={card} />
              </div>
              <BankAccountList card={card} />
            </div>
          </CardContent>
          <BankStatusIcon card={card} />
        </Card>
      ))}
    </section>
  );
}

function BankBalanceSummary({ card }: { card: BankInstitutionCard }) {
  if (card.state !== "connected") {
    return null;
  }

  if (!card.balanceTotals || card.balanceTotals.length === 0) {
    return (
      <p className="mt-6 max-w-48 text-sm text-muted-foreground">
        Saldo pendiente de sincronizar.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-1">
      {card.balanceTotals.map((total) => (
        <p
          key={total.currency}
          className="text-2xl leading-none font-semibold tracking-normal"
        >
          {formatCurrency(total.amount, total.currency)}
        </p>
      ))}
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3Icon className="size-3.5" aria-hidden />
        {formatLatestDate(card.balanceTotals)}
      </p>
    </div>
  );
}

function BankAccountList({ card }: { card: BankInstitutionCard }) {
  if (card.state !== "connected" || !card.accounts?.length) {
    return null;
  }

  return (
    <ul className="space-y-1.5 text-xs">
      {card.accounts.map((account) => (
        <li key={account.id} className="flex min-w-0 items-center gap-2 py-1.5">
          <AccountIcon account={account} />
          <span className="font-medium">
            {account.latestBalance
              ? formatCurrency(
                  account.latestBalance.amount,
                  account.latestBalance.currency
                )
              : "Sin saldo"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AccountIcon({
  account
}: {
  account: NonNullable<BankInstitutionCard["accounts"]>[number];
}) {
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

function BankStatusIcon({ card }: { card: BankInstitutionCard }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  if (canStartConnection(card)) {
    const label = isSubmitting
      ? `Conexión con ${card.name} en curso.`
      : getConnectionActionLabel(card);

    return (
      <form
        action="/api/bank-connections/enable-banking/start"
        method="post"
        className="absolute top-3 right-3 z-20"
        onSubmit={(event) => {
          if (isSubmittingRef.current) {
            event.preventDefault();
            return;
          }

          isSubmittingRef.current = true;
          setIsSubmitting(true);
        }}
      >
        <input type="hidden" name="aspspName" value={card.aspspName} />
        <input type="hidden" name="country" value={card.country} />
        <Tooltip
          triggerType="submit"
          triggerLabel={label}
          label={label}
          triggerClassName={`${getStatusToneClass(
            isSubmitting ? "linking" : card.state
          )} ${isSubmitting ? "" : "cursor-pointer"}`}
          triggerDisabled={isSubmitting}
        >
          {isSubmitting ? (
            <Spinner className="size-7" aria-hidden />
          ) : (
            getConnectionActionIcon(card)
          )}
        </Tooltip>
      </form>
    );
  }

  return (
    <Tooltip
      triggerLabel={card.tooltip}
      label={card.tooltip}
      triggerClassName={`absolute top-3 right-3 z-20 ${getStatusToneClass(card.state)}`}
    >
      {getStatusIcon(card.state)}
    </Tooltip>
  );
}

function canStartConnection(
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

function getConnectionActionLabel(card: BankInstitutionCard): string {
  if (card.state === "error") {
    return `Reintentar conexión con ${card.name}. ${card.tooltip}`;
  }

  if (card.state === "stale-linking") {
    return `Reintentar conexión con ${card.name}. ${card.tooltip}`;
  }

  return `Conectar ${card.name} con Enable Banking.`;
}

function getConnectionActionIcon(card: BankInstitutionCard) {
  if (card.state === "stale-linking") {
    return <TimerResetIcon className="size-7" aria-hidden />;
  }

  return <LinkIcon className="size-7" aria-hidden />;
}

function getStatusToneClass(state: BankInstitutionCard["state"]) {
  if (state === "connected" || state === "idle") {
    return "size-auto border-0 bg-transparent p-0 text-primary shadow-none hover:bg-transparent focus-visible:ring-ring/30";
  }

  if (state === "loading" || state === "linking") {
    return "size-auto border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-transparent focus-visible:ring-ring/30";
  }

  if (state === "stale-linking") {
    return "size-auto border-0 bg-transparent p-0 text-primary shadow-none hover:bg-transparent focus-visible:ring-ring/30";
  }

  return "size-auto border-0 bg-transparent p-0 text-destructive shadow-none hover:bg-transparent focus-visible:ring-ring/30";
}

function getStatusIcon(state: BankInstitutionCard["state"]) {
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

function getAccountTypeIcon({
  accountType,
  name
}: NonNullable<BankInstitutionCard["accounts"]>[number]) {
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

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency
  }).format(Number(amount));
}

function formatLatestDate(
  totals: NonNullable<BankInstitutionCard["balanceTotals"]>
): string {
  const latestFetchedAt = totals
    .map((total) => total.fetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  if (!latestFetchedAt) {
    return "recientemente";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(latestFetchedAt));
}
