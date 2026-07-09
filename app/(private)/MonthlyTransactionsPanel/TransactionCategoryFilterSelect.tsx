"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TransactionCategoryGroupSummary } from "@/definitions";
import { cn } from "@/lib/utils";

import {
  getCategoryFilterLabel,
  getFilteredCategoryGroups
} from "./transactionCategoryFilterOptions";

export function TransactionCategoryFilterSelect({
  categoryGroups,
  selectedCategoryIds,
  disabled,
  onCategoryToggle,
  onClearCategoryFilters
}: {
  categoryGroups: TransactionCategoryGroupSummary[];
  selectedCategoryIds: string[];
  disabled: boolean;
  onCategoryToggle: (categoryId: string) => void;
  onClearCategoryFilters: () => void;
}) {
  const label = getCategoryFilterLabel(selectedCategoryIds, categoryGroups);
  const hasSelectedCategories = selectedCategoryIds.length > 0;

  if (disabled || categoryGroups.length === 0) {
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled
        aria-label="Filtrar por categorías"
        aria-pressed={hasSelectedCategories}
        className="monthly-transaction-filter-chip normal-case tracking-normal"
      >
        <span className="max-w-36 truncate">{label}</span>
        <ChevronDownIcon aria-hidden className="size-3" />
      </Button>
    );
  }

  return (
    <EnabledTransactionCategoryFilterSelect
      categoryGroups={categoryGroups}
      selectedCategoryIds={selectedCategoryIds}
      label={label}
      hasSelectedCategories={hasSelectedCategories}
      onCategoryToggle={onCategoryToggle}
      onClearCategoryFilters={onClearCategoryFilters}
    />
  );
}

function EnabledTransactionCategoryFilterSelect({
  categoryGroups,
  selectedCategoryIds,
  label,
  hasSelectedCategories,
  onCategoryToggle,
  onClearCategoryFilters
}: {
  categoryGroups: TransactionCategoryGroupSummary[];
  selectedCategoryIds: string[];
  label: string;
  hasSelectedCategories: boolean;
  onCategoryToggle: (categoryId: string) => void;
  onClearCategoryFilters: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const filteredCategoryGroups = useMemo(
    () => getFilteredCategoryGroups(categoryGroups, searchValue),
    [categoryGroups, searchValue]
  );

  return (
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
        aria-label="Filtrar por categorías"
        aria-pressed={hasSelectedCategories}
        className={cn(
          buttonVariants({ variant: "outline", size: "xs" }),
          "monthly-transaction-filter-chip normal-case tracking-normal"
        )}
      >
        <span className="max-w-36 truncate">{label}</span>
        <ChevronDownIcon aria-hidden className="size-3" />
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
            <div className="max-h-72 overflow-y-auto p-1.5">
              {filteredCategoryGroups.length > 0 ? (
                filteredCategoryGroups.map((group) => (
                  <div key={group.id} className="scroll-my-1.5 py-1">
                    <p className="px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {group.name}
                    </p>
                    {group.categories.map((category) => {
                      const isSelected = selectedCategoryIds.includes(
                        category.id
                      );

                      return (
                        <label
                          key={category.id}
                          htmlFor={`transaction-category-filter-${category.id}`}
                          className="relative flex cursor-pointer items-center gap-2.5 rounded-none py-2 pr-3 pl-3 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-within:bg-accent focus-within:text-accent-foreground"
                        >
                          <CheckboxPrimitive.Root
                            id={`transaction-category-filter-${category.id}`}
                            checked={isSelected}
                            onCheckedChange={() =>
                              onCategoryToggle(category.id)
                            }
                            className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-input bg-transparent text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground"
                          >
                            <CheckboxPrimitive.Indicator>
                              <CheckIcon aria-hidden className="size-3" />
                            </CheckboxPrimitive.Indicator>
                          </CheckboxPrimitive.Root>
                          <span className="min-w-0 flex-1 truncate">
                            {category.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No hay categorías
                </p>
              )}
            </div>
            {hasSelectedCategories ? (
              <div className="border-t border-border/50 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="w-full normal-case tracking-normal"
                  onClick={onClearCategoryFilters}
                >
                  Limpiar categorías
                </Button>
              </div>
            ) : null}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
