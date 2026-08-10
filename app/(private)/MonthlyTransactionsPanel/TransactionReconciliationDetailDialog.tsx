"use client";

import {
  AlertTriangleIcon,
  LoaderCircleIcon,
  Trash2Icon,
  XIcon
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type {
  TransactionCategoryGroupSummary,
  TransactionLabelSummary,
  TransactionReconciliationDetail,
  TransactionReconciliationDifferenceTreatment
} from "@/definitions";

import { formatCurrency } from "./formatters";
import {
  deleteReconciliationAction,
  getReconciliationDetailAction
} from "./reconciliationActions";
import { TransactionReconciliationDialog } from "./TransactionReconciliationDialog";

const KIND_LABELS = {
  debt: "Deuda/préstamo",
  reimbursement: "Reembolso",
  refund: "Devolución",
  other: "Otro"
} as const;

const TREATMENT_LABELS = {
  none: "Balance cerrado",
  neutralized: "Diferencia neutralizada",
  reportable: "Diferencia reportada"
} as const;

export function TransactionReconciliationDetailDialog({
  reconciliationId,
  categoryGroups,
  availableLabels,
  onSaved,
  onDeleted,
  onClose
}: {
  reconciliationId: string;
  categoryGroups: TransactionCategoryGroupSummary[];
  availableLabels: TransactionLabelSummary[];
  onSaved: (input: {
    reconciliationId: string;
    transactionIds: string[];
    previousTransactionIds: string[];
    differenceTreatment: TransactionReconciliationDifferenceTreatment;
  }) => void;
  onDeleted: (reconciliationId: string) => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TransactionReconciliationDetail | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    void getReconciliationDetailAction({ reconciliationId })
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.ok) {
          setDetail(result.value);
        } else {
          setError(result.reason);
        }
      })
      .catch(() => {
        if (active) {
          setError("No se pudo cargar la compensación.");
        }
      });

    return () => {
      active = false;
    };
  }, [reconciliationId]);

  async function handleDelete() {
    if (
      !window.confirm(
        "¿Eliminar esta compensación? Sus movimientos volverán a contabilizarse."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    const result = await deleteReconciliationAction({
      reconciliationId
    }).catch(() => null);

    if (!result?.ok) {
      setError(result?.reason ?? "No se pudo eliminar la compensación.");
      setIsDeleting(false);
      return;
    }

    onDeleted(reconciliationId);
    onClose();
  }

  if (isEditing && detail) {
    return (
      <TransactionReconciliationDialog
        sourceTransaction={null}
        initialDetail={detail}
        categoryGroups={categoryGroups}
        availableLabels={availableLabels}
        onSaved={onSaved}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
      >
        <button
          type="button"
          aria-label="Cerrar compensación"
          className="absolute top-3 right-3 flex size-11 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={onClose}
        >
          <XIcon aria-hidden className="size-5" />
        </button>
        <DialogHeader className="pr-12">
          <DialogTitle>Compensación</DialogTitle>
          <DialogDescription>
            Revisa los movimientos y el tratamiento de su balance actual.
          </DialogDescription>
        </DialogHeader>

        {!detail && !error ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
            Cargando compensación
          </div>
        ) : null}

        {detail ? (
          <div className="grid gap-6">
            {detail.requiresReview ? (
              <div className="flex gap-3 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertTriangleIcon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                />
                <p>
                  El banco modificó uno de los importes y el grupo ya no suma
                  cero. Edita la compensación para decidir cómo tratar la
                  diferencia.
                </p>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-5">
              <DetailItem label="Tipo" value={KIND_LABELS[detail.kind]} />
              <DetailItem
                label="Balance actual"
                value={formatCurrency(detail.currentBalance, detail.currency)}
              />
              <DetailItem
                label="Tratamiento"
                value={TREATMENT_LABELS[detail.differenceTreatment]}
              />
              {detail.adjustmentReportingDate ? (
                <DetailItem
                  label="Fecha del ajuste"
                  value={detail.adjustmentReportingDate}
                />
              ) : null}
              {detail.adjustmentCategory ? (
                <DetailItem
                  label="Categoría del ajuste"
                  value={detail.adjustmentCategory.name}
                />
              ) : null}
              {detail.adjustmentLabels.length > 0 ? (
                <DetailItem
                  label="Etiquetas del ajuste"
                  value={detail.adjustmentLabels
                    .map((label) => label.name)
                    .join(", ")}
                />
              ) : null}
              {detail.note ? (
                <div className="col-span-2">
                  <DetailItem label="Nota" value={detail.note} />
                </div>
              ) : null}
            </dl>

            <section>
              <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Movimientos ({detail.members.length})
              </h3>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {detail.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-medium">
                        {getMemberConcept(member)}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {member.reportingDate ?? "Sin fecha"} ·{" "}
                        {member.institutionName}
                      </span>
                      {member.bookingStatus !== "booked" ||
                      member.isInternalTransfer ? (
                        <span className="mt-1 block text-xs text-destructive">
                          Clasificación actual incompatible; permanece
                          compensado.
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatCurrency(member.amount, member.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
              >
                <Trash2Icon aria-hidden />
                {isDeleting ? "Eliminando…" : "Eliminar"}
              </Button>
              <Button type="button" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
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

function getMemberConcept(
  member: TransactionReconciliationDetail["members"][number]
): string {
  return (
    member.merchantName?.trim() ||
    member.counterpartyName?.trim() ||
    member.description?.trim() ||
    "Movimiento sin concepto"
  );
}
