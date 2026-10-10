"use client";

import { useId } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Minus,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import type { ProgressRow } from "@/definitions";

export function LoadingSteps({
  label,
  rows,
  busy,
  expanded,
  onToggle,
  onAction,
  disabled = false,
  floating = false
}: {
  label: string;
  rows: ProgressRow[];
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAction?: () => void;
  disabled?: boolean;
  floating?: boolean;
}) {
  const contentId = useId();
  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      aria-expanded={busy ? expanded : undefined}
      aria-controls={busy ? contentId : undefined}
      onClick={busy ? (floating ? undefined : onToggle) : onAction}
      className="max-w-full"
    >
      {busy ? (
        <Spinner className="motion-reduce:animate-none" aria-hidden />
      ) : (
        <RefreshCw aria-hidden />
      )}
      <span className="min-w-0 truncate" role="status" aria-live="polite">
        {label}
      </span>
      {busy && (
        <ChevronDown
          aria-hidden
          className={`transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        />
      )}
    </Button>
  );
  const announcement = (
    <span className="sr-only" role="status" aria-live="polite">
      {rows
        .filter((row) => row.status === "running")
        .map(
          (row) =>
            `${row.label}. ${row.children?.find((child) => child.status === "running")?.detail ?? row.detail ?? ""}`
        )
        .join(". ")}
    </span>
  );
  const steps = (
    <ol
      aria-label="Pasos de carga"
      className={`${floating ? "" : "ml-4 mt-2 "}space-y-2 border-l border-border py-1 pl-4`}
    >
      {rows.map((row) => (
        <StepRow key={row.id} row={row} />
      ))}
    </ol>
  );

  if (floating) {
    return (
      <div className="w-fit max-w-full text-left">
        <Popover
          open={busy && expanded}
          onOpenChange={(open) => {
            if (busy && open !== expanded) onToggle();
          }}
        >
          <PopoverTrigger
            render={trigger}
            aria-haspopup={busy ? "dialog" : undefined}
            aria-expanded={busy ? expanded : undefined}
          />
          <PopoverContent
            id={contentId}
            align="start"
            sideOffset={8}
            initialFocus={false}
            finalFocus={false}
            aria-label="Pasos de actualización"
            className="max-h-(--available-height) w-[min(23.75rem,calc(100vw-3rem))] overflow-y-auto motion-reduce:animate-none"
          >
            {steps}
          </PopoverContent>
        </Popover>
        {announcement}
      </div>
    );
  }

  return (
    <div className={`${expanded ? "w-full" : "w-fit"} max-w-95 text-left`}>
      {trigger}
      {announcement}
      <div
        id={contentId}
        inert={!expanded}
        className="grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0
        }}
      >
        <div className="overflow-hidden">{steps}</div>
      </div>
    </div>
  );
}

function StepRow({ row }: { row: ProgressRow }) {
  const alert = row.status === "warning" || row.status === "error";
  return (
    <li className="text-sm">
      <div
        className={`flex items-start gap-2 ${row.status === "error" ? "text-destructive" : row.status === "pending" || row.status === "skipped" ? "text-muted-foreground" : "text-foreground"}`}
      >
        <span className="flex h-5 shrink-0 items-center">
          {row.status === "running" ? (
            <Spinner
              aria-hidden
              className="size-3.5 motion-reduce:animate-none"
            />
          ) : alert ? (
            <CircleAlert aria-hidden className="size-3.5" />
          ) : row.status === "completed" ? (
            <Check aria-hidden className="size-3.5 text-muted-foreground" />
          ) : (
            <Minus aria-hidden className="size-3.5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="font-medium">{row.label}</p>
          <p className="text-xs text-muted-foreground">
            {row.detail ?? "Pendiente"}
          </p>
        </div>
      </div>
      {row.children && (
        <ol className="ml-5 mt-2 space-y-2" aria-label={row.label}>
          {row.children.map((child) => (
            <StepRow key={child.id} row={child} />
          ))}
        </ol>
      )}
    </li>
  );
}
