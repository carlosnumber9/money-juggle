"use client";

import {
  AlertTriangleIcon,
  CheckIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
  XIcon
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary,
  TransactionLabelSummary,
  TransactionReconciliationCandidate,
  TransactionReconciliationCandidateCursor,
  TransactionReconciliationDifferenceTreatment,
  TransactionReconciliationKind
} from "@/definitions";
import { parseDecimal } from "@/lib/domain/decimal";
import {
  cleanTransactionLabelName,
  isValidTransactionLabelName
} from "@/lib/domain/labels";
import { cn } from "@/lib/utils";

import { formatCurrency } from "./formatters";
import {
  calculateReconciliationBalance,
  getDefaultAdjustmentDate,
  mapTransactionToReconciliationCandidate,
  mergeCandidateRows
} from "./reconciliationEditor";
import {
  saveReconciliationAction,
  searchReconciliationCandidatesAction
} from "./reconciliationActions";
import { useMediaQuery } from "./useMediaQuery";

type DifferenceChoice = Exclude<
  TransactionReconciliationDifferenceTreatment,
  "none"
>;

const KIND_OPTIONS: Array<{
  value: TransactionReconciliationKind;
  label: string;
}> = [
  { value: "debt", label: "Deuda/préstamo" },
  { value: "reimbursement", label: "Reembolso" },
  { value: "refund", label: "Devolución" },
  { value: "other", label: "Otro" }
];

export function TransactionReconciliationDialog({
  sourceTransaction,
  categoryGroups,
  availableLabels,
  onSaved,
  onClose
}: {
  sourceTransaction: MonthlyTransactionSummary;
  categoryGroups: TransactionCategoryGroupSummary[];
  availableLabels: TransactionLabelSummary[];
  onSaved: (input: {
    reconciliationId: string;
    transactionIds: string[];
    differenceTreatment: TransactionReconciliationDifferenceTreatment;
  }) => void;
  onClose: () => void;
}) {
  const source = useMemo(
    () => mapTransactionToReconciliationCandidate(sourceTransaction),
    [sourceTransaction]
  );
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [kind, setKind] = useState<TransactionReconciliationKind>("debt");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<
    TransactionReconciliationCandidate[]
  >([source]);
  const [selected, setSelected] = useState<
    TransactionReconciliationCandidate[]
  >([source]);
  const [cursor, setCursor] =
    useState<TransactionReconciliationCandidateCursor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDifferenceStep, setShowDifferenceStep] = useState(false);
  const [differenceChoice, setDifferenceChoice] =
    useState<DifferenceChoice>("neutralized");
  const [categoryId, setCategoryId] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(
    source.reportingDate ?? ""
  );
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [newLabelNames, setNewLabelNames] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const loadRequestRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const balance = calculateReconciliationBalance(selected);
  const balanceValue = parseDecimal(balance);
  const selectedIds = useMemo(
    () => new Set(selected.map((transaction) => transaction.id)),
    [selected]
  );
  const reportableCategories = useMemo(
    () =>
      categoryGroups.flatMap((group) =>
        group.categories
          .filter(
            (category) =>
              category.slug !== "internal_transfer" &&
              category.slug !== "shared_expense_settlement"
          )
          .map((category) => ({ ...category, groupName: group.name }))
      ),
    [categoryGroups]
  );

  useEffect(() => {
    const requestId = ++loadRequestRef.current;
    const timeout = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        const result = await searchReconciliationCandidatesAction({
          currency: source.currency,
          query,
          cursor: null,
          reconciliationId: null
        }).catch(() => null);

        if (requestId !== loadRequestRef.current) {
          return;
        }

        if (!result?.ok) {
          setError(result?.reason ?? "No se pudieron cargar los movimientos.");
          setIsLoading(false);
          return;
        }

        setCandidates(mergeCandidateRows([source], result.value.rows));
        setCursor(result.value.nextCursor);
        setIsLoading(false);
      })();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query, source]);

  const loadMoreCandidates = useCallback(async () => {
    if (!cursor || isLoading) {
      return;
    }

    const requestId = loadRequestRef.current;
    setIsLoading(true);
    const result = await searchReconciliationCandidatesAction({
      currency: source.currency,
      query,
      cursor,
      reconciliationId: null
    }).catch(() => null);

    if (requestId !== loadRequestRef.current) {
      return;
    }

    if (!result?.ok) {
      setError(result?.reason ?? "No se pudieron cargar los movimientos.");
      setIsLoading(false);
      return;
    }

    setCandidates((current) => mergeCandidateRows(current, result.value.rows));
    setCursor(result.value.nextCursor);
    setIsLoading(false);
  }, [cursor, isLoading, query, source.currency]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !cursor || isLoading) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadMoreCandidates();
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, isLoading, loadMoreCandidates]);

  function toggleCandidate(candidate: TransactionReconciliationCandidate) {
    if (candidate.id === source.id) {
      return;
    }

    setSelected((current) =>
      current.some((transaction) => transaction.id === candidate.id)
        ? current.filter((transaction) => transaction.id !== candidate.id)
        : [...current, candidate]
    );
    setIsDirty(true);
    setShowDifferenceStep(false);
    setError(null);
  }

  function requestClose() {
    if (
      isDirty &&
      !window.confirm("¿Descartar los cambios de esta compensación?")
    ) {
      return;
    }

    onClose();
  }

  async function handleFinish() {
    if (selected.length < 2) {
      setError("Selecciona al menos dos movimientos.");
      return;
    }

    if (kind === "other" && !note.trim()) {
      setError("Añade una nota para explicar esta compensación.");
      return;
    }

    if (balanceValue !== 0n && !showDifferenceStep) {
      setAdjustmentDate(getDefaultAdjustmentDate(selected));
      setShowDifferenceStep(true);
      setError(null);
      return;
    }

    if (differenceChoice === "reportable" && !categoryId) {
      setError("Elige una categoría para reportar la diferencia.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const difference =
      balanceValue === 0n
        ? ({ treatment: "none" } as const)
        : differenceChoice === "neutralized"
          ? ({ treatment: "neutralized" } as const)
          : ({
              treatment: "reportable" as const,
              categoryId,
              reportingDate: adjustmentDate,
              labelIds: selectedLabelIds,
              newLabelNames
            } as const);
    const result = await saveReconciliationAction({
      reconciliationId: null,
      sourceTransactionId: source.id,
      kind,
      note: note.trim() || null,
      transactionIds: selected.map((transaction) => transaction.id),
      expectedBalance: balance,
      difference
    }).catch(() => null);

    if (!result?.ok) {
      setError(result?.reason ?? "No se pudo guardar la compensación.");
      setIsSaving(false);
      return;
    }

    setIsDirty(false);
    onSaved({
      reconciliationId: result.value.reconciliationId,
      transactionIds: selected.map((transaction) => transaction.id),
      differenceTreatment: difference.treatment
    });
    setIsSaving(false);
    onClose();
  }

  function addNewLabel() {
    const cleanName = cleanTransactionLabelName(labelInput);

    if (
      !isValidTransactionLabelName(cleanName) ||
      newLabelNames.some(
        (name) =>
          name.toLocaleLowerCase("es") === cleanName.toLocaleLowerCase("es")
      )
    ) {
      return;
    }

    const existing = availableLabels.find(
      (label) =>
        label.name.toLocaleLowerCase("es") === cleanName.toLocaleLowerCase("es")
    );

    if (existing) {
      setSelectedLabelIds((current) =>
        current.includes(existing.id) ? current : [...current, existing.id]
      );
    } else {
      setNewLabelNames((current) => [...current, cleanName]);
    }

    setLabelInput("");
    setIsDirty(true);
  }

  return (
    <ReconciliationSurface isMobile={isMobile} onClose={requestClose}>
      <header className="relative border-b border-border px-4 py-4 pr-16 md:px-6 md:py-5">
        <h2
          id="transaction-reconciliation-title"
          className="text-lg leading-none font-semibold tracking-wider uppercase"
        >
          Compensar movimientos
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Agrupa movimientos que representan un mismo flujo temporal de dinero.
        </p>
        <button
          type="button"
          aria-label="Cerrar compensación"
          className="absolute top-3 right-3 flex size-11 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={requestClose}
        >
          <XIcon aria-hidden className="size-5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.8fr)]">
        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col md:border-r md:border-border",
            showDifferenceStep && "max-md:hidden"
          )}
        >
          <div className="grid gap-4 border-b border-border p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Tipo
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    setKind(value as TransactionReconciliationKind);
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Nota {kind === "other" ? "obligatoria" : "opcional"}
                <Textarea
                  value={note}
                  placeholder="Dinero adelantado por mi madre"
                  className="min-h-10 py-2 normal-case"
                  onChange={(event) => {
                    setNote(event.target.value);
                    setIsDirty(true);
                  }}
                />
              </label>
            </div>
            <label className="relative block">
              <SearchIcon
                aria-hidden
                className="absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                className="pl-6"
                placeholder="Buscar por concepto, importe, fecha, banco, categoría o etiqueta"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                checked={selectedIds.has(candidate.id)}
                locked={candidate.id === source.id}
                onToggle={() => toggleCandidate(candidate)}
              />
            ))}
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-5 text-sm text-muted-foreground">
                <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
                Cargando movimientos
              </div>
            ) : null}
            {!isLoading && candidates.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No hay movimientos compatibles.
              </p>
            ) : null}
            <div ref={sentinelRef} className="h-px" />
          </div>
        </section>

        <aside className="flex min-h-0 shrink-0 flex-col bg-muted/20 md:flex-1">
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto p-4 md:p-5",
              !showDifferenceStep && "max-md:hidden"
            )}
          >
            {showDifferenceStep ? (
              <button
                type="button"
                className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground md:hidden"
                onClick={() => setShowDifferenceStep(false)}
              >
                Volver a movimientos
              </button>
            ) : null}
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Seleccionados ({selected.length})
            </p>
            <ul className="mt-3 grid gap-2">
              {selected.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="line-clamp-2 min-w-0">
                    {getCandidateConcept(transaction)}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                </li>
              ))}
            </ul>

            {showDifferenceStep && balanceValue !== 0n ? (
              <DifferenceControls
                choice={differenceChoice}
                categoryId={categoryId}
                adjustmentDate={adjustmentDate}
                categories={reportableCategories}
                availableLabels={availableLabels}
                selectedLabelIds={selectedLabelIds}
                newLabelNames={newLabelNames}
                labelInput={labelInput}
                onChoiceChange={(choice) => {
                  setDifferenceChoice(choice);
                  setIsDirty(true);
                }}
                onCategoryChange={(value) => {
                  setCategoryId(value);
                  setIsDirty(true);
                }}
                onDateChange={(value) => {
                  setAdjustmentDate(value);
                  setIsDirty(true);
                }}
                onExistingLabelToggle={(labelId) => {
                  setSelectedLabelIds((current) =>
                    current.includes(labelId)
                      ? current.filter((id) => id !== labelId)
                      : [...current, labelId]
                  );
                  setIsDirty(true);
                }}
                onNewLabelRemove={(name) =>
                  setNewLabelNames((current) =>
                    current.filter((labelName) => labelName !== name)
                  )
                }
                onLabelInputChange={setLabelInput}
                onLabelAdd={addNewLabel}
              />
            ) : null}
          </div>

          <footer className="border-t border-border bg-popover p-4 md:p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Balance
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold tabular-nums",
                    balanceValue === 0n ? "text-primary" : "text-foreground"
                  )}
                >
                  {formatCurrency(balance, source.currency)}
                </p>
              </div>
              <Button
                type="button"
                disabled={selected.length < 2 || isSaving}
                onClick={() => void handleFinish()}
              >
                {isSaving
                  ? "Guardando…"
                  : showDifferenceStep
                    ? "Guardar"
                    : "Finalizar"}
              </Button>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </footer>
        </aside>
      </div>
    </ReconciliationSurface>
  );
}

function ReconciliationSurface({
  isMobile,
  onClose,
  children
}: {
  isMobile: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (isMobile) {
    return (
      <Drawer
        open
        swipeDirection="down"
        onOpenChange={(open) => !open && onClose()}
      >
        <DrawerContent
          aria-labelledby="transaction-reconciliation-title"
          className="border-0 [--drawer-content-max-height:calc(100dvh-3rem)]"
        >
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-labelledby="transaction-reconciliation-title"
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] w-[min(58rem,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({
  candidate,
  checked,
  locked,
  onToggle
}: {
  candidate: TransactionReconciliationCandidate;
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  const concept = getCandidateConcept(candidate);
  const labels = candidate.labels.map((label) => label.name).join(", ");

  return (
    <label className="flex cursor-pointer gap-3 border-b border-border/70 px-5 py-4 hover:bg-muted/40">
      <Checkbox
        checked={checked}
        disabled={locked}
        aria-label={locked ? `${concept}, movimiento de partida` : concept}
        onCheckedChange={onToggle}
      />
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted-foreground">
        {candidate.institutionName.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="line-clamp-2 font-medium">{concept}</span>
          <span className="shrink-0 font-semibold tabular-nums">
            {formatCurrency(candidate.amount, candidate.currency)}
          </span>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {candidate.reportingDate ?? "Sin fecha"} · {candidate.institutionName}{" "}
          · {candidate.accountName}
          {candidate.accountIbanLast4
            ? ` · •••• ${candidate.accountIbanLast4}`
            : ""}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {candidate.category ? (
            <span className="bg-muted px-2 py-1 text-xs text-muted-foreground">
              {candidate.category.name}
            </span>
          ) : null}
          {labels ? (
            <span className="max-w-56 truncate bg-muted px-2 py-1 text-xs text-muted-foreground">
              {labels}
            </span>
          ) : null}
          {locked ? (
            <span className="px-2 py-1 text-xs font-medium text-primary">
              Movimiento de partida
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function DifferenceControls({
  choice,
  categoryId,
  adjustmentDate,
  categories,
  availableLabels,
  selectedLabelIds,
  newLabelNames,
  labelInput,
  onChoiceChange,
  onCategoryChange,
  onDateChange,
  onExistingLabelToggle,
  onNewLabelRemove,
  onLabelInputChange,
  onLabelAdd
}: {
  choice: DifferenceChoice;
  categoryId: string;
  adjustmentDate: string;
  categories: Array<{ id: string; name: string; groupName: string }>;
  availableLabels: TransactionLabelSummary[];
  selectedLabelIds: string[];
  newLabelNames: string[];
  labelInput: string;
  onChoiceChange: (choice: DifferenceChoice) => void;
  onCategoryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onExistingLabelToggle: (labelId: string) => void;
  onNewLabelRemove: (name: string) => void;
  onLabelInputChange: (value: string) => void;
  onLabelAdd: () => void;
}) {
  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangleIcon aria-hidden className="size-4" />
        Queda una diferencia
      </p>
      <div className="mt-3 grid gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="difference-treatment"
            checked={choice === "neutralized"}
            onChange={() => onChoiceChange("neutralized")}
          />
          Neutralizar diferencia
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="difference-treatment"
            checked={choice === "reportable"}
            onChange={() => onChoiceChange("reportable")}
          />
          Reportar diferencia
        </label>
      </div>

      {choice === "reportable" ? (
        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Categoría
            <Select
              value={categoryId}
              onValueChange={(value) => value && onCategoryChange(value)}
            >
              <SelectTrigger className="w-full normal-case">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.groupName} · {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Fecha del ajuste
            <Input
              type="date"
              value={adjustmentDate}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Etiquetas opcionales
            </legend>
            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
              {availableLabels.map((label) => {
                const selected = selectedLabelIds.includes(label.id);

                return (
                  <button
                    key={label.id}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 bg-muted px-2 py-1 text-xs",
                      selected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => onExistingLabelToggle(label.id)}
                  >
                    {selected ? (
                      <CheckIcon aria-hidden className="size-3" />
                    ) : null}
                    {label.name}
                  </button>
                );
              })}
              {newLabelNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="inline-flex items-center gap-1 bg-primary px-2 py-1 text-xs text-primary-foreground"
                  onClick={() => onNewLabelRemove(name)}
                >
                  {name}
                  <XIcon aria-hidden className="size-3" />
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Input
                value={labelInput}
                placeholder="Crear etiqueta"
                onChange={(event) => onLabelInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onLabelAdd();
                  }
                }}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Añadir etiqueta"
                onClick={onLabelAdd}
              >
                <PlusIcon aria-hidden />
              </Button>
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}

function getCandidateConcept(
  candidate: TransactionReconciliationCandidate
): string {
  return (
    candidate.merchantName?.trim() ||
    candidate.counterpartyName?.trim() ||
    candidate.description?.trim() ||
    "Movimiento sin concepto"
  );
}
