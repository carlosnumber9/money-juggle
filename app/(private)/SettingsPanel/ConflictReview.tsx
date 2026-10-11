"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CategoryRuleSettings } from "@/definitions";
import { RuleSelect } from "./RuleSelect";
export function ConflictReview({
  view,
  busy,
  onAssign
}: {
  view: CategoryRuleSettings;
  busy: boolean;
  onAssign: (id: string, categoryId: string) => void;
}) {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const items = view.categories
    .flatMap((group) => group.categories)
    .map((category) => ({ value: category.id, label: category.name }));
  return (
    <ul className="space-y-5">
      {view.conflicts.map((row) => (
        <li key={row.id} className="space-y-2 text-sm">
          <p>
            {row.booking_date} · {row.description ?? "Movimiento"} ·{" "}
            {row.currency}
          </p>
          <RuleSelect
            label="Categoría del movimiento"
            value={selection[row.id] ?? ""}
            items={items}
            disabled={busy}
            onChange={(value) =>
              setSelection({ ...selection, [row.id]: value })
            }
          />
          <Button
            size="xs"
            disabled={busy || !selection[row.id]}
            onClick={() => onAssign(row.id, selection[row.id])}
          >
            Asignar manualmente
          </Button>
        </li>
      ))}
    </ul>
  );
}
