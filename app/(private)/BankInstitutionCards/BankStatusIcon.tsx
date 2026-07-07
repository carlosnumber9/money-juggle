"use client";

import { useRef, useState } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { Tooltip } from "@/components/ui/Tooltip";
import type { BankInstitutionCard } from "@/definitions";

import {
  canStartConnection,
  getConnectionActionIcon,
  getConnectionActionLabel,
  getStatusIcon
} from "./statusHelpers";
import { getStatusToneClass } from "./statusTone";

export function BankStatusIcon({ card }: { card: BankInstitutionCard }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  if (canStartConnection(card)) {
    return (
      <ConnectionForm
        card={card}
        isSubmitting={isSubmitting}
        onSubmittingChange={setIsSubmitting}
        isSubmittingRef={isSubmittingRef}
      />
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
