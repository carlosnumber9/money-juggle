"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type {
  Result,
  TransactionLabelSettingsView,
  TransactionLabelSummary
} from "@/definitions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  MAX_TRANSACTION_LABEL_LENGTH,
  isValidTransactionLabelName
} from "@/lib/domain/labels";
import { useMonthInvalidation } from "../MonthlyTransactionsPanel/useMonthInvalidation";
import {
  createTransactionLabelAction,
  deleteTransactionLabelAction,
  renameTransactionLabelAction
} from "./labelActions";
import {
  replaceSettingsLabel,
  resolveLabelNameEdit,
  sortSettingsLabels
} from "./labelEditor";

export function TransactionLabelsCard({
  view
}: {
  view: TransactionLabelSettingsView;
}) {
  const router = useRouter();
  const cache = useMonthInvalidation();
  const [list, setList] = useState({
    source: view.labels,
    labels: sortSettingsLabels(view.labels)
  });
  const [editing, setEditing] = useState<{
    label: TransactionLabelSummary;
    draft: string;
  } | null>(null);
  const [modal, setModal] = useState<
    | { kind: "create" }
    | { kind: "delete"; label: TransactionLabelSummary }
    | null
  >(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mutationPending = useRef(false);
  const cancelledEdit = useRef(false);
  const focusNameInput = useCallback((element: HTMLInputElement | null) => {
    if (element) {
      element.focus();
      element.select();
    }
  }, []);

  // Refresh authoritative data without resetting a draft being edited.
  if (list.source !== view.labels) {
    setList({ source: view.labels, labels: sortSettingsLabels(view.labels) });
  }

  async function mutate<T>(
    operation: () => Promise<Result<T>>,
    onSaved: (value: T) => void,
    onFailed?: () => void
  ) {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await operation().catch(() => null);
      cache.checkResult(result);
      if (!result?.ok) {
        onFailed?.();
        setError(
          result?.reason ?? "No se pudo guardar el cambio. Inténtalo de nuevo."
        );
        return;
      }
      onSaved(result.value);
      setModal(null);
      await cache.invalidate().catch(() => undefined);
      router.refresh();
    } finally {
      mutationPending.current = false;
      setBusy(false);
    }
  }

  function finishEdit() {
    if (!editing || cancelledEdit.current) return;
    const { label, draft } = editing;
    setEditing(null);
    const edit = resolveLabelNameEdit(label.name, draft);
    if (edit.kind === "unchanged") return;
    if (edit.kind === "invalid") {
      setError("Escribe un nombre de entre 1 y 80 caracteres.");
      return;
    }
    setList((current) => ({
      ...current,
      labels: replaceSettingsLabel(current.labels, {
        ...label,
        name: edit.name
      })
    }));
    void mutate(
      () =>
        renameTransactionLabelAction({ labelId: label.id, name: edit.name }),
      (saved) =>
        setList((current) => ({
          ...current,
          labels: replaceSettingsLabel(current.labels, saved)
        })),
      () =>
        setList((current) => ({
          ...current,
          labels: replaceSettingsLabel(current.labels, label)
        }))
    );
  }

  return (
    <Card className="min-w-0 w-full p-0">
      <CardContent className="p-5 sm:p-6">
        <header className="mb-4 space-y-3">
          <h2 className="text-lg font-semibold tracking-normal">Etiquetas</h2>
          <Button
            size="xs"
            disabled={busy || Boolean(view.error)}
            onClick={() => {
              setError(null);
              setNewName("");
              setModal({ kind: "create" });
            }}
          >
            Crear etiqueta
          </Button>
          {(error || view.error) && !modal && (
            <div role="alert" className="text-sm text-destructive">
              {error || view.error}
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  router.refresh();
                }}
              >
                Recargar
              </Button>
            </div>
          )}
        </header>
        <div
          className="h-[420px] min-w-0 overflow-auto overscroll-contain [&_[data-slot=table-container]]:overflow-visible"
          role="region"
          aria-label="Listado de etiquetas"
          aria-busy={busy}
          tabIndex={0}
        >
          <Table className="table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.labels.map((label) => (
                <TableRow key={label.id}>
                  <TableCell className="whitespace-normal">
                    {editing?.label.id === label.id ? (
                      <Input
                        ref={focusNameInput}
                        aria-label={`Nombre de etiqueta ${label.name}`}
                        maxLength={MAX_TRANSACTION_LABEL_LENGTH}
                        value={editing.draft}
                        onChange={(event) =>
                          setEditing({
                            label: editing.label,
                            draft: event.target.value
                          })
                        }
                        onBlur={finishEdit}
                        onKeyDown={(event) => {
                          if (event.nativeEvent.isComposing) return;
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelledEdit.current = true;
                            setEditing(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="min-h-11 w-full cursor-pointer text-left break-words font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [overflow-wrap:anywhere] disabled:cursor-not-allowed"
                        aria-label={`Editar etiqueta ${label.name}`}
                        disabled={busy || Boolean(view.error)}
                        onClick={() => {
                          cancelledEdit.current = false;
                          setError(null);
                          setEditing({ label, draft: label.name });
                        }}
                      >
                        {label.name}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="w-16">
                    <Button
                      size="icon-lg"
                      variant="ghost"
                      aria-label={`Eliminar etiqueta ${label.name}`}
                      disabled={busy || Boolean(view.error)}
                      onClick={() => {
                        setError(null);
                        setModal({ kind: "delete", label });
                      }}
                    >
                      <Trash2 className="size-6" aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {list.labels.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {view.error
                      ? "Etiquetas no disponibles."
                      : "No hay etiquetas todavía."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {modal && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) {
              setModal(null);
              setError(null);
            }
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {modal.kind === "create"
                  ? "Crear etiqueta"
                  : "Eliminar etiqueta"}
              </DialogTitle>
              <DialogDescription>
                {modal.kind === "create"
                  ? "Elige un nombre para la etiqueta."
                  : `Se eliminará «${modal.label.name}» y se quitará de todas las transacciones y conciliaciones. Los movimientos y las conciliaciones se conservarán.`}
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (modal.kind === "create") {
                  void mutate(
                    () => createTransactionLabelAction({ name: newName }),
                    (saved) =>
                      setList((current) => ({
                        ...current,
                        labels: replaceSettingsLabel(current.labels, saved)
                      }))
                  );
                } else {
                  const labelId = modal.label.id;
                  void mutate(
                    () => deleteTransactionLabelAction({ labelId }),
                    () =>
                      setList((current) => ({
                        ...current,
                        labels: current.labels.filter(
                          (label) => label.id !== labelId
                        )
                      }))
                  );
                }
              }}
            >
              {modal.kind === "create" && (
                <label className="grid gap-1 text-xs">
                  Nombre
                  <Input
                    autoFocus
                    required
                    maxLength={MAX_TRANSACTION_LABEL_LENGTH}
                    value={newName}
                    disabled={busy}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </label>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setModal(null);
                    setError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant={modal.kind === "delete" ? "destructive" : "default"}
                  disabled={
                    busy ||
                    (modal.kind === "create" &&
                      !isValidTransactionLabelName(newName))
                  }
                >
                  {busy
                    ? "Guardando…"
                    : modal.kind === "create"
                      ? "Crear"
                      : "Eliminar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
