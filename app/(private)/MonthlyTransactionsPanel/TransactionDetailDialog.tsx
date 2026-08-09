"use client";

import { XIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import type {
  MonthlyTransactionSummary,
  TransactionLabelSummary
} from "@/definitions";

import { formatCurrency, getTransactionConcept } from "./formatters";
import {
  getInstitutionLogo,
  type InstitutionLogoStyle
} from "./institutionLogo";
import { TransactionLabelSelector } from "./TransactionLabelSelector";
import { TransactionReportingDatePicker } from "./TransactionReportingDatePicker";

const DIALOG_TITLE_ID = "transaction-detail-title";

export function TransactionDetailDialog({
  transaction,
  availableLabels,
  onLabelsChange,
  onAvailableLabelAdd,
  onReportingDateChange,
  onClose
}: {
  transaction: MonthlyTransactionSummary | null;
  availableLabels: TransactionLabelSummary[];
  onLabelsChange: (
    transactionId: string,
    labels: TransactionLabelSummary[]
  ) => void;
  onAvailableLabelAdd: (label: TransactionLabelSummary) => void;
  onReportingDateChange: (transactionId: string, reportingDate: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (transaction && !dialog.open) {
      dialog.showModal();
    } else if (!transaction && dialog.open) {
      dialog.close();
    }
  }, [transaction]);

  const concept = transaction ? getTransactionConcept(transaction) : "";
  const description = getAdditionalDescription(transaction, concept);
  const logo = transaction ? getInstitutionLogo(transaction) : null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={DIALOG_TITLE_ID}
      className="transaction-detail-dialog m-auto h-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%-2rem))] overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-card p-0 text-card-foreground shadow-xl"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close();
        }
      }}
    >
      {transaction ? (
        <>
          {logo?.path ? (
            <span
              aria-hidden
              className="transaction-detail-watermark"
              style={
                {
                  "--institution-logo": `url(${logo.path})`,
                  "--institution-logo-color": logo.color
                } as InstitutionLogoStyle
              }
            />
          ) : null}

          <div className="relative z-10 p-6 sm:p-7">
            <button
              type="button"
              autoFocus
              aria-label="Cerrar detalle"
              className="absolute top-4 right-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              onClick={() => dialogRef.current?.close()}
            >
              <XIcon aria-hidden className="size-4" />
            </button>

            <header className="pr-10">
              <h2
                id={DIALOG_TITLE_ID}
                className="text-xl leading-snug font-semibold text-balance"
              >
                {concept}
              </h2>
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
            </header>

            <dl className="mt-7 grid gap-5 border-t border-border/70 pt-5">
              <div className="grid gap-2">
                <dt className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Fecha
                </dt>
                <dd>
                  <TransactionReportingDatePicker
                    transaction={transaction}
                    portalContainer={dialogRef}
                    onReportingDateChange={(reportingDate) =>
                      onReportingDateChange(transaction.id, reportingDate)
                    }
                  />
                </dd>
              </div>
              {description ? (
                <DetailItem label="Descripción" value={description} />
              ) : null}
              <DetailItem
                label="Categoría"
                value={transaction.category?.name ?? "Sin categoría"}
              />
              <div className="grid gap-2">
                <dt className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Etiquetas
                </dt>
                <dd>
                  <TransactionLabelSelector
                    transaction={transaction}
                    availableLabels={availableLabels}
                    onLabelsChange={(labels) =>
                      onLabelsChange(transaction.id, labels)
                    }
                    onAvailableLabelAdd={onAvailableLabelAdd}
                  />
                </dd>
              </div>
            </dl>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

function getAdditionalDescription(
  transaction: MonthlyTransactionSummary | null,
  concept: string
): string | null {
  const description = transaction?.description?.trim();

  if (
    !description ||
    normalizeDetailText(description) === normalizeDetailText(concept)
  ) {
    return null;
  }

  return description;
}

function normalizeDetailText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
}
