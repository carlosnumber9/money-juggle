"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";
import { cn } from "@/lib/utils";

import { getTransactionConcept } from "./formatters";
import {
  getSelectedCategoryLabel,
  UNCATEGORIZED_CATEGORY_VALUE
} from "./transactionCategoryOptions";
import { getFilteredCategoryGroups } from "./transactionCategoryFilterOptions";
import { useTransactionCategoryAssignment } from "./useTransactionCategoryAssignment";

export function TransactionCategorySelect({
  transaction,
  categoryGroups
}: {
  transaction: MonthlyTransactionSummary;
  categoryGroups: TransactionCategoryGroupSummary[];
}) {
  const {
    isPending,
    saveError,
    selectedCategoryValue,
    updateSelectedCategory
  } = useTransactionCategoryAssignment(transaction);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const selectedCategoryLabel = getSelectedCategoryLabel(
    selectedCategoryValue,
    categoryGroups,
    transaction
  );
  const filteredCategoryGroups = useMemo(
    () => getFilteredCategoryGroups(categoryGroups, searchValue),
    [categoryGroups, searchValue]
  );
  const showUncategorizedOption = doesUncategorizedOptionMatch(searchValue);

  function selectCategory(categoryValue: string) {
    setIsOpen(false);
    setSearchValue("");

    if (categoryValue !== selectedCategoryValue) {
      updateSelectedCategory(categoryValue);
    }
  }

  return (
    <div className="monthly-transaction-category-select flex min-w-0 flex-col items-center gap-1">
      <PopoverPrimitive.Root
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);

          if (!open) {
            setSearchValue("");
          }
        }}
      >
        <PopoverPrimitive.Trigger
          type="button"
          disabled={isPending}
          aria-label={`Categoría de ${getTransactionConcept(transaction)}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "xs" }),
            "h-auto max-w-52 min-w-0 justify-start gap-1 border-b border-b-input px-0 py-0 text-xs font-normal tracking-normal normal-case text-muted-foreground"
          )}
        >
          <span className="min-w-0 truncate">{selectedCategoryLabel}</span>
          <ChevronDownIcon aria-hidden className="size-3 shrink-0" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            className="isolate z-50"
          >
            <PopoverPrimitive.Popup
              initialFocus={false}
              className="relative isolate z-50 w-72 rounded-none bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            >
              <div className="border-b border-border/50 p-3">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Buscar categoría"
                  aria-label="Buscar categoría"
                  className="h-8 text-sm"
                />
              </div>
              <div
                role="listbox"
                aria-label="Categorías"
                className="max-h-72 overflow-y-auto p-1.5"
              >
                {showUncategorizedOption ? (
                  <CategoryOption
                    value={UNCATEGORIZED_CATEGORY_VALUE}
                    label="Sin categoría"
                    isSelected={
                      selectedCategoryValue === UNCATEGORIZED_CATEGORY_VALUE
                    }
                    onSelect={selectCategory}
                  />
                ) : null}
                {filteredCategoryGroups.map((group) => (
                  <div key={group.id} className="scroll-my-1.5 py-1">
                    <p className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {group.name}
                    </p>
                    {group.categories.map((category) => (
                      <CategoryOption
                        key={category.id}
                        value={category.id}
                        label={category.name}
                        isSelected={selectedCategoryValue === category.id}
                        onSelect={selectCategory}
                      />
                    ))}
                  </div>
                ))}
                {!showUncategorizedOption &&
                filteredCategoryGroups.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No hay categorías
                  </p>
                ) : null}
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {saveError ? (
        <span className="text-center text-xs text-destructive" role="status">
          {saveError}
        </span>
      ) : null}
    </div>
  );
}

function CategoryOption({
  value,
  label,
  isSelected,
  onSelect
}: {
  value: string;
  label: string;
  isSelected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      className="relative flex w-full cursor-pointer items-center gap-2.5 rounded-none py-2 pr-8 pl-3 text-left text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
      onClick={() => onSelect(value)}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {isSelected ? (
        <CheckIcon
          aria-hidden
          className="pointer-events-none absolute right-2 size-3.5"
        />
      ) : null}
    </button>
  );
}

function doesUncategorizedOptionMatch(searchValue: string): boolean {
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase("es");

  return (
    normalizedSearchValue.length === 0 ||
    "sin categoría".includes(normalizedSearchValue) ||
    "sin categoria".includes(normalizedSearchValue)
  );
}
