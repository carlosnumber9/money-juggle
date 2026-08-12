"use client";

import { useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import type { BankInstitutionCard } from "@/definitions";

import {
  canStartConnection,
  getConnectionActionIcon,
  getConnectionActionLabel,
  getStatusIcon
} from "./statusHelpers";
import { getStatusToneClass } from "./statusTone";
import {
  BANK_AUTHORIZATION_STARTED_EVENT,
  prepareBankAuthorizationWindow
} from "./bankAuthorizationWindow";
import { getLinkingStaleDelay, markLinkingCardStale } from "./liveLinkingState";

export function BankStatusIcon({ card }: { card: BankInstitutionCard }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiredLinkingStaleAt, setExpiredLinkingStaleAt] = useState<
    string | null
  >(null);
  const isSubmittingRef = useRef(false);
  const liveCard =
    card.state === "linking" && expiredLinkingStaleAt === card.linkingStaleAt
      ? markLinkingCardStale(card)
      : card;

  useEffect(() => {
    const delay = getLinkingStaleDelay(card);

    if (delay === null || !card.linkingStaleAt) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setExpiredLinkingStaleAt(card.linkingStaleAt ?? null);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [card]);

  if (canStartConnection(liveCard)) {
    return (
      <ConnectionForm
        card={liveCard}
        isSubmitting={isSubmitting}
        onSubmittingChange={setIsSubmitting}
        isSubmittingRef={isSubmittingRef}
      />
    );
  }

  return (
    <Tooltip
      triggerLabel={liveCard.tooltip}
      label={liveCard.tooltip}
      triggerClassName={`absolute top-3 right-3 z-20 ${getStatusToneClass(liveCard.state)}`}
    >
      {getStatusIcon(liveCard.state)}
    </Tooltip>
  );
}

function ConnectionForm({
  card,
  isSubmitting,
  onSubmittingChange,
  isSubmittingRef
}: {
  card: BankInstitutionCard & { aspspName: string; country: string };
  isSubmitting: boolean;
  onSubmittingChange(value: boolean): void;
  isSubmittingRef: React.MutableRefObject<boolean>;
}) {
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

        if (prepareBankAuthorizationWindow(event.currentTarget)) {
          window.dispatchEvent(new Event(BANK_AUTHORIZATION_STARTED_EVENT));
        }
        isSubmittingRef.current = true;
        onSubmittingChange(true);
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
