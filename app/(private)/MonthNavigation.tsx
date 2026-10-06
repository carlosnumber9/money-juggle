"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { MonthlyPeriodView } from "@/definitions";
import { cn } from "@/lib/utils";

export function MonthNavigation({
  selectedMonth,
  tab,
  className,
  pending = false,
  onMonthChange
}: {
  selectedMonth: MonthlyPeriodView;
  tab: "transactions" | "evolution";
  className?: string;
  pending?: boolean;
  onMonthChange?: (month: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const navigationPending = pending || isPending;

  function navigateTo(month: string) {
    if (navigationPending) return;
    if (onMonthChange) {
      onMonthChange(month);
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    nextSearchParams.set("month", month);
    nextSearchParams.set("tab", tab);
    if (tab === "transactions") {
      window.history.pushState(
        null,
        "",
        `${pathname}?${nextSearchParams.toString()}`
      );
      return;
    }
    startTransition(() => {
      router.push(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false
      });
    });
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      aria-label="Seleccionar mes"
    >
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label={`Ver ${formatNavigationLabel(selectedMonth.previousMonth)}`}
        disabled={navigationPending}
        onClick={() => navigateTo(selectedMonth.previousMonth)}
      >
        <ChevronLeftIcon aria-hidden />
      </Button>
      <span className="min-w-32 text-center text-sm font-medium capitalize">
        {selectedMonth.label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label={
          selectedMonth.nextMonth
            ? `Ver ${formatNavigationLabel(selectedMonth.nextMonth)}`
            : "No hay un mes posterior disponible"
        }
        disabled={navigationPending || !selectedMonth.nextMonth}
        onClick={() => {
          if (selectedMonth.nextMonth) {
            navigateTo(selectedMonth.nextMonth);
          }
        }}
      >
        <ChevronRightIcon aria-hidden />
      </Button>
    </div>
  );
}

function formatNavigationLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}
