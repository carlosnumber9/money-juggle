"use client";

import { CircleCheck, CirclePause, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { CategoryRule } from "@/definitions";

export function RuleRow({
  rule,
  busy,
  onEdit,
  onToggle,
  onRemove
}: {
  rule: CategoryRule;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const proposed = rule.status === "proposed";
  const active = rule.status === "active";
  const StatusIcon = proposed ? Sparkles : active ? CircleCheck : CirclePause;
  const statusLabel = proposed ? "Propuesta" : active ? "Activa" : "Pausada";
  const statusAction = proposed ? "Revisar" : active ? "Pausar" : "Activar";

  return (
    <TableRow
      className="cursor-pointer"
      aria-label={`Regla ${rule.name}`}
      aria-disabled={busy}
      onClick={() => {
        if (!busy) onEdit();
      }}
    >
      <TableCell className="whitespace-normal">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            size="icon-lg"
            variant="ghost"
            className={
              active
                ? "shrink-0 text-primary"
                : "shrink-0 text-muted-foreground"
            }
            aria-label={`${statusAction} regla ${rule.name}`}
            aria-pressed={proposed ? undefined : active}
            title={statusLabel}
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              if (proposed) onEdit();
              else onToggle();
            }}
          >
            <StatusIcon className="size-6" aria-hidden />
          </Button>
          <button
            type="button"
            className="min-w-0 flex-1 cursor-pointer rounded-sm text-left break-words font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [overflow-wrap:anywhere] disabled:cursor-not-allowed"
            aria-label={`Editar regla ${rule.name}`}
            aria-haspopup="dialog"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            {rule.name}
          </button>
        </div>
      </TableCell>
      <TableCell className="w-16">
        <Button
          size="icon-lg"
          variant="ghost"
          aria-label={`${proposed ? "Descartar" : "Borrar"} regla ${rule.name}`}
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          {proposed ? (
            <X className="size-6" aria-hidden />
          ) : (
            <Trash2 className="size-6" aria-hidden />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
