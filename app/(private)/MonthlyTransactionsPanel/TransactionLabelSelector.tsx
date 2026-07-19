"use client";

import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import type {
  MonthlyTransactionSummary,
  TransactionLabelSummary
} from "@/definitions";
import {
  cleanTransactionLabelName,
  filterAvailableTransactionLabels,
  findExactTransactionLabel,
  isValidTransactionLabelName
} from "@/lib/domain/labels";

import {
  assignTransactionLabelAction,
  createAndAssignTransactionLabelAction,
  removeTransactionLabelAction
} from "./actions";

type LabelOption =
  | { kind: "create"; name: string }
  | { kind: "existing"; label: TransactionLabelSummary };

export function TransactionLabelSelector({
  transaction,
  availableLabels,
  onLabelsChange,
  onAvailableLabelAdd
}: {
  transaction: MonthlyTransactionSummary;
  availableLabels: TransactionLabelSummary[];
  onLabelsChange: (labels: TransactionLabelSummary[]) => void;
  onAvailableLabelAdd: (label: TransactionLabelSummary) => void;
}) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const filteredLabels = useMemo(
    () =>
      filterAvailableTransactionLabels(
        availableLabels,
        transaction.labels,
        searchValue
      ),
    [availableLabels, searchValue, transaction.labels]
  );
  const exactLabel = findExactTransactionLabel(availableLabels, searchValue);
  const cleanName = cleanTransactionLabelName(searchValue);
  const canCreate =
    isValidTransactionLabelName(searchValue) && exactLabel === null;
  const options: LabelOption[] = [
    ...(canCreate ? [{ kind: "create" as const, name: cleanName }] : []),
    ...filteredLabels.map((label) => ({ kind: "existing" as const, label }))
  ];
  const isListOpen = isFocused && cleanName.length > 0 && options.length > 0;

  async function assignExistingLabel(label: TransactionLabelSummary) {
    const previousLabels = transaction.labels;
    const nextLabels = [...previousLabels, label];

    setIsPending(true);
    setSaveError(null);
    onLabelsChange(nextLabels);

    const result = await assignTransactionLabelAction({
      transactionId: transaction.id,
      labelId: label.id
    }).catch(() => null);

    if (!result?.ok) {
      onLabelsChange(previousLabels);
      setSaveError(
        result?.reason ?? "No se pudo guardar la etiqueta. Inténtalo de nuevo."
      );
    } else {
      resetInput();
    }

    setIsPending(false);
  }

  async function createLabel(name: string) {
    const previousLabels = transaction.labels;
    const temporaryLabel = {
      id: `temporary-${crypto.randomUUID()}`,
      name
    };

    setIsPending(true);
    setSaveError(null);
    onLabelsChange([...previousLabels, temporaryLabel]);

    const result = await createAndAssignTransactionLabelAction({
      transactionId: transaction.id,
      name
    }).catch(() => null);

    if (!result?.ok) {
      onLabelsChange(previousLabels);
      setSaveError(
        result?.reason ?? "No se pudo guardar la etiqueta. Inténtalo de nuevo."
      );
    } else {
      onLabelsChange([...previousLabels, result.value]);
      onAvailableLabelAdd(result.value);
      resetInput();
    }

    setIsPending(false);
  }

  async function removeLabel(label: TransactionLabelSummary) {
    const previousLabels = transaction.labels;

    setIsPending(true);
    setSaveError(null);
    onLabelsChange(previousLabels.filter((item) => item.id !== label.id));

    const result = await removeTransactionLabelAction({
      transactionId: transaction.id,
      labelId: label.id
    }).catch(() => null);

    if (!result?.ok) {
      onLabelsChange(previousLabels);
      setSaveError(
        result?.reason ?? "No se pudo quitar la etiqueta. Inténtalo de nuevo."
      );
    }

    setIsPending(false);
  }

  function selectOption(option: LabelOption | undefined) {
    if (!option || isPending) {
      return;
    }

    if (option.kind === "create") {
      void createLabel(option.name);
    } else {
      void assignExistingLabel(option.label);
    }
  }

  function resetInput() {
    setSearchValue("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="grid gap-2">
      {transaction.labels.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Etiquetas asignadas">
          {transaction.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted py-1 pr-1 pl-2.5 text-xs text-muted-foreground"
            >
              <span className="truncate">{label.name}</span>
              <button
                type="button"
                disabled={isPending}
                aria-label={`Quitar etiqueta ${label.name}`}
                className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void removeLabel(label)}
              >
                <XIcon aria-hidden className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin etiquetas</p>
      )}

      <div>
        <Input
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isListOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isListOpen ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-label="Añadir etiqueta"
          placeholder="Buscar o crear etiqueta"
          value={searchValue}
          disabled={isPending}
          maxLength={80}
          onBlur={() => setIsFocused(false)}
          onFocus={() => setIsFocused(true)}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setActiveIndex(0);
            setSaveError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && options.length > 0) {
              event.preventDefault();
              setActiveIndex((current) => (current + 1) % options.length);
            } else if (event.key === "ArrowUp" && options.length > 0) {
              event.preventDefault();
              setActiveIndex(
                (current) => (current - 1 + options.length) % options.length
              );
            } else if (event.key === "Enter") {
              event.preventDefault();

              if (cleanName.length === 0) {
                return;
              }

              const exactUnassignedLabel = filteredLabels.find(
                (label) => label.id === exactLabel?.id
              );

              selectOption(
                exactLabel
                  ? exactUnassignedLabel
                    ? { kind: "existing", label: exactUnassignedLabel }
                    : undefined
                  : options[activeIndex]
              );
            } else if (event.key === "Escape") {
              setSearchValue("");
              setActiveIndex(0);
            }
          }}
        />

        {isListOpen ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Etiquetas disponibles"
            className="mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {options.map((option, index) => {
              const key =
                option.kind === "create"
                  ? `create-${option.name}`
                  : option.label.id;
              const label =
                option.kind === "create"
                  ? `Crear “${option.name}”`
                  : option.label.name;

              return (
                <button
                  key={key}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  {option.kind === "create" ? (
                    <PlusIcon aria-hidden className="size-3.5 shrink-0" />
                  ) : (
                    <CheckIcon
                      aria-hidden
                      className="size-3.5 shrink-0 opacity-0"
                    />
                  )}
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {saveError ? (
        <p className="text-xs text-destructive" role="status">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
