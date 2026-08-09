"use client";

import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type RefObject } from "react";
import { es } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { buttonVariants } from "@/components/ui/button";
import type { MonthlyTransactionSummary } from "@/definitions";
import { cn } from "@/lib/utils";

import { updateTransactionReportingDateAction } from "./actions";
import { formatTransactionDetailDate } from "./formatters";

export function TransactionReportingDatePicker({
  transaction,
  portalContainer,
  onReportingDateChange
}: {
  transaction: MonthlyTransactionSummary;
  portalContainer: RefObject<HTMLElement | null>;
  onReportingDateChange: (reportingDate: string) => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const selectedDate = parseCalendarDate(transaction.reporting_date);
  const bookingDate = parseCalendarDate(transaction.booking_date);

  async function selectDate(date: Date | undefined) {
    if (!date || isPending) {
      return;
    }

    const reportingDate = formatCalendarDate(date);

    setIsOpen(false);

    if (reportingDate === transaction.reporting_date) {
      return;
    }

    setIsPending(true);
    setSaveError(null);

    const result = await updateTransactionReportingDateAction({
      transactionId: transaction.id,
      reportingDate
    }).catch(() => null);

    if (!result?.ok) {
      setSaveError(
        result?.reason ?? "No se pudo guardar la fecha. Inténtalo de nuevo."
      );
      setIsPending(false);
      return;
    }

    onReportingDateChange(result.value.reportingDate);
    setIsPending(false);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!isPending) {
            setIsOpen(open);
          }
        }}
      >
        <PopoverTrigger
          type="button"
          disabled={isPending}
          aria-label="Editar fecha del movimiento"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-fit min-w-48 justify-start normal-case tracking-normal"
          )}
        >
          {isPending ? (
            <Spinner aria-label="Guardando fecha" className="size-4" />
          ) : (
            <CalendarIcon aria-hidden className="size-4" />
          )}
          <span>{formatTransactionDetailDate(transaction.reporting_date)}</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto gap-3 p-0"
          container={portalContainer}
        >
          <Calendar
            mode="single"
            locale={es}
            selected={selectedDate ?? undefined}
            defaultMonth={selectedDate ?? bookingDate ?? undefined}
            modifiers={bookingDate ? { bankDate: bookingDate } : undefined}
            modifiersClassNames={{
              bankDate:
                "[&_button]:ring-2 [&_button]:ring-primary/60 [&_button]:ring-offset-1 [&_button]:ring-offset-background"
            }}
            onSelect={(date) => void selectDate(date)}
          />
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span
              aria-hidden
              className="mr-2 inline-block size-2 rounded-full ring-2 ring-primary/60"
            />
            Fecha del banco:{" "}
            {formatTransactionDetailDate(transaction.booking_date)}
          </p>
        </PopoverContent>
      </Popover>

      {saveError ? (
        <p className="text-xs text-destructive" role="status">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}

function parseCalendarDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatCalendarDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
