"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Pause, Play, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
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
  CategoryRuleSettings,
  Result
} from "@/definitions";
import { useMonthInvalidation } from "../MonthlyTransactionsPanel/useMonthInvalidation";
import {
  saveCategoryRuleAction,
  changeCategoryRuleStatusAction
} from "./actions";
import { ConflictReview } from "./ConflictReview";
import { updateTransactionCategoryAction } from "../MonthlyTransactionsPanel/actions";
import { RuleEditor } from "./RuleEditor";
import { RuleSelect } from "./RuleSelect";
const statusLabels = {
  proposed: "Propuesta",
  active: "Activa",
  paused: "Pausada",
  dismissed: "Descartada",
  deleted: "Borrada"
};
export function SettingsPanel({ view }: { view: CategoryRuleSettings }) {
  const router = useRouter();
  const cache = useMonthInvalidation();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState<{ rule: CategoryRule | null } | null>(
    null
  );
  const [removing, setRemoving] = useState<CategoryRule | null>(null);
  const [conflicts, setConflicts] = useState(false);
  function mutate(operation: () => Promise<Result<null>>) {
    setError(null);
    startTransition(async () => {
      const result = await operation().catch(() => null);
      cache.checkResult(result);
      if (!result?.ok) {
        setError(result?.reason ?? "No se pudo guardar el cambio.");
        return;
      }
      setEditor(null);
      setRemoving(null);
      router.refresh();
    });
  }
  function save(input: CategoryRuleInput) {
    mutate(() => saveCategoryRuleAction(input));
  }
  const categories = view.categories.flatMap((group) => group.categories);
  const rules = view.rules.filter(
    (rule) => filter === "all" || rule.status === filter
  );
  return (
    <section
      aria-label="Configuración"
      className="mt-6 grid w-full min-w-0 gap-6 lg:grid-cols-2"
    >
      <Card className="min-w-0 w-full p-0">
        <CardContent className="p-5 sm:p-6">
          <header className="mb-4 space-y-3">
            <h2 className="text-lg font-semibold tracking-normal">
              Reglas de categorización
            </h2>
            <p className="text-sm text-muted-foreground">
              Confirma reglas una vez para categorizar futuros movimientos.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="xs"
                disabled={busy || Boolean(view.error)}
                onClick={() => setEditor({ rule: null })}
              >
                Crear regla
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled
                title="Disponible al completar detección"
              >
                Detectar reglas
              </Button>
              {view.conflicts.length > 0 && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setConflicts(true)}
                >
                  Revisar conflictos ({view.conflicts.length})
                </Button>
              )}
            </div>
            <RuleSelect
              label="Filtrar reglas"
              value={filter}
              items={[
                { value: "all", label: "Todos los estados" },
                { value: "proposed", label: "Propuestas" },
                { value: "active", label: "Activas" },
                { value: "paused", label: "Pausadas" }
              ]}
              onChange={setFilter}
            />
            {(error || view.error) && (
              <div role="alert" className="text-sm text-destructive">
                {error || view.error}
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => router.refresh()}
                >
                  Recargar
                </Button>
              </div>
            )}
          </header>
          <div
            className="h-[420px] min-w-0 overflow-auto overscroll-contain [&_[data-slot=table-container]]:overflow-visible"
            aria-busy={busy}
            role="region"
            aria-label="Listado de reglas"
            tabIndex={0}
          >
            <Table className="min-w-[620px]">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Regla</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="max-w-48 whitespace-normal">
                      <p className="font-medium">{rule.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rule.field === "merchant_name"
                          ? "Comercio"
                          : rule.field === "counterparty_name"
                            ? "Contraparte"
                            : "Descripción"}{" "}
                        · {rule.operator === "equals" ? "Igual" : "Contiene"}
                        <br />
                        {rule.direction === "expense"
                          ? "Gasto"
                          : "Ingreso"} · {rule.currency}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-28 whitespace-normal">
                      {categories.find(
                        (category) => category.id === rule.category_id
                      )?.name ??
                        (rule.category_id ? "No disponible" : "Por elegir")}
                    </TableCell>
                    <TableCell className="max-w-28 whitespace-normal">
                      {rule.account_id
                        ? (view.accounts.find(
                            (account) => account.id === rule.account_id
                          )?.name ?? "Cuenta no disponible")
                        : "Todas las cuentas"}
                    </TableCell>
                    <TableCell>{statusLabels[rule.status]}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Editar regla ${rule.value}`}
                          disabled={busy}
                          onClick={() => setEditor({ rule })}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        {rule.status === "active" ? (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Pausar regla ${rule.value}`}
                            disabled={busy}
                            onClick={() =>
                              mutate(() =>
                                changeCategoryRuleStatusAction({
                                  id: rule.id,
                                  version: rule.version,
                                  status: "paused"
                                })
                              )
                            }
                          >
                            <Pause aria-hidden />
                          </Button>
                        ) : (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`${rule.status === "proposed" ? "Revisar" : "Activar"} regla ${rule.value}`}
                            disabled={busy}
                            onClick={() =>
                              setEditor({
                                rule: {
                                  ...rule,
                                  status:
                                    rule.status === "paused"
                                      ? "active"
                                      : rule.status
                                }
                              })
                            }
                          >
                            <Play aria-hidden />
                          </Button>
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`${rule.status === "proposed" ? "Descartar" : "Borrar"} regla ${rule.value}`}
                          disabled={busy}
                          onClick={() => setRemoving(rule)}
                        >
                          {rule.status === "proposed" ? (
                            <X aria-hidden />
                          ) : (
                            <Trash2 aria-hidden />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {view.error
                        ? "Reglas no disponibles."
                        : "No hay reglas en este estado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {editor && (
        <RuleEditor
          key={editor.rule?.id ?? "new"}
          rule={editor.rule}
          view={view}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      {removing && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setRemoving(null);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {removing.status === "proposed"
                  ? "Descartar propuesta"
                  : "Borrar regla"}
              </DialogTitle>
              <DialogDescription>
                Las categorías asignadas anteriormente se conservarán.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setRemoving(null)}
              >
                Cancelar
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  mutate(() =>
                    changeCategoryRuleStatusAction({
                      id: removing.id,
                      version: removing.version,
                      status:
                        removing.status === "proposed" ? "dismissed" : "deleted"
                    })
                  )
                }
              >
                Confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {conflicts && (
        <Dialog open onOpenChange={setConflicts}>
          <DialogContent
            showCloseButton={false}
            className="max-h-[80dvh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>Movimientos con conflictos</DialogTitle>
              <DialogDescription>
                Coinciden reglas con categorías distintas. Revisa reglas o
                asigna categoría manualmente desde Transacciones. Se muestran
                hasta 100 movimientos.
              </DialogDescription>
            </DialogHeader>
            <ConflictReview
              view={view}
              busy={busy}
              onAssign={(transactionId, categoryId) =>
                mutate(async () => {
                  const result = await updateTransactionCategoryAction({
                    transactionId,
                    categoryId
                  });
                  if (result.ok) await cache.invalidate();
                  return result;
                })
              }
            />
            <Button
              variant="outline"
              onClick={() => {
                setConflicts(false);
                router.push("/?tab=transactions");
              }}
            >
              Ir a Transacciones
            </Button>
            <Button onClick={() => setConflicts(false)}>Cerrar</Button>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
