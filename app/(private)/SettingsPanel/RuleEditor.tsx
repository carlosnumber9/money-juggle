"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import type {
  CategoryRule,
  CategoryRuleInput,
  CategoryRuleSettings
} from "@/definitions";
import { RuleSelect } from "./RuleSelect";
const fieldLabels = {
  merchant_name: "Comercio",
  counterparty_name: "Contraparte",
  description: "Descripción"
};
export function RuleEditor({
  rule,
  view,
  busy,
  onClose,
  onSave
}: {
  rule: CategoryRule | null;
  view: CategoryRuleSettings;
  busy: boolean;
  onClose: () => void;
  onSave: (input: CategoryRuleInput) => void;
}) {
  const [input, setInput] = useState<CategoryRuleInput>({
    id: rule?.id,
    version: rule?.version,
    category_id: rule?.category_id ?? "",
    field: rule?.field ?? "merchant_name",
    operator: rule?.operator ?? "equals",
    value: rule?.value ?? "",
    currency: rule?.currency ?? "EUR",
    direction: rule?.direction ?? "expense",
    account_id: rule?.account_id ?? null,
    status: rule?.status === "paused" ? "paused" : "active"
  });
  const categories = view.categories.flatMap((group) => group.categories);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {rule?.status === "proposed"
              ? "Revisar propuesta"
              : rule
                ? "Editar regla"
                : "Crear regla"}
          </DialogTitle>
          <DialogDescription>
            Una vez activa, asignará categoría a futuras coincidencias. Los
            movimientos anteriores conservarán su categoría.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(input);
          }}
        >
          <label className="grid gap-1 text-xs">
            Campo
            <RuleSelect
              label="Campo"
              value={input.field}
              items={Object.entries(fieldLabels).map(([value, label]) => ({
                value,
                label
              }))}
              onChange={(value) =>
                setInput({
                  ...input,
                  field: value as CategoryRuleInput["field"],
                  operator: "equals"
                })
              }
            />
          </label>
          <label className="grid gap-1 text-xs">
            Condición
            <RuleSelect
              label="Condición"
              value={input.operator}
              items={[
                { value: "equals", label: "Es igual a" },
                ...(input.field === "description"
                  ? [{ value: "contains", label: "Contiene" }]
                  : [])
              ]}
              onChange={(value) =>
                setInput({
                  ...input,
                  operator: value as CategoryRuleInput["operator"]
                })
              }
            />
          </label>
          <label className="grid gap-1 text-xs">
            Texto
            <Input
              required
              maxLength={300}
              value={input.value}
              onChange={(event) =>
                setInput({ ...input, value: event.target.value })
              }
            />
          </label>
          <label className="grid gap-1 text-xs">
            Categoría
            <RuleSelect
              label="Categoría"
              value={input.category_id}
              items={categories.map((category) => ({
                value: category.id,
                label: category.name
              }))}
              onChange={(value) => setInput({ ...input, category_id: value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1 text-xs">
              Moneda
              <Input
                required
                pattern="[A-Z]{3}"
                maxLength={3}
                value={input.currency}
                onChange={(event) =>
                  setInput({
                    ...input,
                    currency: event.target.value.toUpperCase()
                  })
                }
              />
            </label>
            <label className="grid gap-1 text-xs">
              Dirección
              <RuleSelect
                label="Dirección"
                value={input.direction}
                items={[
                  { value: "expense", label: "Gasto" },
                  { value: "income", label: "Ingreso" }
                ]}
                onChange={(value) =>
                  setInput({
                    ...input,
                    direction: value as CategoryRuleInput["direction"]
                  })
                }
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs">
            Cuenta
            <RuleSelect
              label="Cuenta"
              value={input.account_id ?? "all"}
              items={[
                { value: "all", label: "Todas las cuentas" },
                ...view.accounts.map((account) => ({
                  value: account.id,
                  label: account.name
                }))
              ]}
              onChange={(value) =>
                setInput({
                  ...input,
                  account_id: value === "all" ? null : value
                })
              }
            />
          </label>
          <label className="grid gap-1 text-xs">
            Estado
            <RuleSelect
              label="Estado"
              value={input.status}
              items={[
                { value: "active", label: "Activa" },
                { value: "paused", label: "Pausada" }
              ]}
              onChange={(value) =>
                setInput({
                  ...input,
                  status: value as CategoryRuleInput["status"]
                })
              }
            />
          </label>
          {rule?.evidence && (
            <div className="space-y-2 border-t pt-3 text-xs">
              <p>{rule.evidence.months} meses con coincidencias.</p>
              {rule.evidence.categoryIds.length > 1 && (
                <p className="text-destructive">
                  Hay categorías anteriores distintas. Elige categoría y revisa
                  condición antes de activar.
                </p>
              )}
              <p>
                Categorías anteriores:{" "}
                {rule.evidence.categoryIds
                  .map(
                    (id) =>
                      categories.find((c) => c.id === id)?.name ??
                      "No disponible"
                  )
                  .join(", ") || "Sin categoría"}
                .
              </p>
              <ul className="space-y-2">
                {rule.evidence.examples.map((example, index) => (
                  <li key={index}>
                    <span className="text-muted-foreground">
                      {example.date}
                    </span>{" "}
                    · {example.description} ·{" "}
                    {categories.find((c) => c.id === example.categoryId)
                      ?.name ?? "Sin categoría"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || !input.category_id || !input.value.trim()}
            >
              {busy
                ? "Guardando…"
                : rule?.status === "proposed"
                  ? "Confirmar regla"
                  : "Guardar regla"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
