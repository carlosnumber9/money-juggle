"use client";

import { FileSpreadsheetIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { getExportPeriod } from "@/lib/reports/monthlyExport/period";

import { requestMonthlyWorkbook, saveMonthlyWorkbook } from "./download";
import { getDefaultReportName, getReportDownloadName } from "./fileName";

export function MonthlyExportButton({
  defaultMonth,
  currentMonth,
  disabled
}: {
  defaultMonth: string;
  currentMonth: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth);
  const [name, setName] = useState(getDefaultReportName(defaultMonth));
  const [customName, setCustomName] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) {
      setMonth(defaultMonth);
      setName(getDefaultReportName(defaultMonth));
      setCustomName(false);
      setError(null);
    } else {
      requestRef.current?.abort();
      requestRef.current = null;
      setGenerating(false);
    }
    setOpen(nextOpen);
  }

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestRef.current || disabled) return;
    const fileName = getReportDownloadName(name);
    if (!fileName) {
      setError(
        "Escribe un nombre de 1 a 120 caracteres, sin separadores de ruta ni caracteres especiales."
      );
      return;
    }
    if (!getExportPeriod(month)) {
      setError("Selecciona un mes válido que no sea futuro.");
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setGenerating(true);
    setError(null);
    try {
      const blob = await requestMonthlyWorkbook(month, controller.signal);
      if (controller.signal.aborted) return;
      saveMonthlyWorkbook(blob, fileName);
      changeOpen(false);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "No se pudo generar el informe."
        );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setGenerating(false);
      }
    }
  }

  return (
    <>
      <Tooltip
        label="Exportar informe mensual a Excel"
        triggerLabel="Exportar informe mensual"
        triggerClassName="size-8 rounded-none"
        triggerDisabled={disabled}
        onClick={() => changeOpen(true)}
      >
        <FileSpreadsheetIcon className="size-4" aria-hidden />
      </Tooltip>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent showCloseButton={false}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-4 right-4"
            aria-label="Cerrar exportación"
            onClick={() => changeOpen(false)}
          >
            <XIcon aria-hidden />
          </Button>
          <div className="pr-8">
            <DialogTitle>Exportar informe mensual</DialogTitle>
            <DialogDescription>
              Resumen, categorías y cuentas con los datos guardados. El informe
              indicará las carencias de cobertura.
            </DialogDescription>
          </div>
          <form onSubmit={generate} className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium">
              Nombre del fichero
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  maxLength={125}
                  required
                  disabled={generating}
                  onChange={(event) => {
                    setName(event.target.value);
                    setCustomName(true);
                  }}
                />
                <span className="text-muted-foreground">.xlsx</span>
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Mes
              <Input
                type="month"
                min="2000-01"
                max={currentMonth}
                value={month}
                required
                disabled={generating}
                onChange={(event) => {
                  const nextMonth = event.target.value;
                  setMonth(nextMonth);
                  if (!customName) setName(getDefaultReportName(nextMonth));
                }}
              />
            </label>
            {month === currentMonth ? (
              <p className="text-sm text-muted-foreground">
                El mes actual se exportará como provisional.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={generating || disabled}>
                {generating ? (
                  <>
                    <Spinner aria-hidden />
                    Generando…
                  </>
                ) : (
                  "Generar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
