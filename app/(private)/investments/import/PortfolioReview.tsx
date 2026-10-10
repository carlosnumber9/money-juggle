"use client";
import { useActionState, useState } from "react";
import type {
  PortfolioImportReview,
  PortfolioImportState,
  PortfolioPosition,
  PortfolioValues
} from "@/definitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPortfolioReview } from "@/lib/domain/portfolio/review";
import { confirmPortfolioImportAction } from "./actions";
import { formatImportAmount } from "./formatters";

export function PortfolioReview({ review }: { review: PortfolioImportReview }) {
  const [values, setValues] = useState<PortfolioValues>({
    reportDate: review.draft.original.reportDate,
    currency: "EUR",
    cash: review.draft.original.cash,
    positions: review.draft.original.positions
  });
  const [state, action, pending] = useActionState(
    confirmPortfolioImportAction,
    { error: null } as PortfolioImportState
  );
  const summary = getPortfolioReview(values, review.draft.original);
  const existing =
    state.existing === undefined ? review.existing : state.existing;
  const reviewedDate = state.reviewedDate ?? review.draft.original.reportDate;
  function editPosition(
    index: number,
    key: keyof PortfolioPosition,
    value: string
  ) {
    setValues((current) => ({
      ...current,
      positions: current.positions.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      )
    }));
  }
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="draftId" value={review.draft.id} />
      <input type="hidden" name="values" value={JSON.stringify(values)} />
      <input
        type="hidden"
        name="expectedRevision"
        value={existing?.revision ?? ""}
      />
      <input type="hidden" name="reviewedDate" value={reviewedDate} />
      <fieldset disabled={pending} className="grid gap-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm">Fecha del informe</span>
            <Input
              type="date"
              required
              value={values.reportDate}
              onChange={(event) =>
                setValues({ ...values, reportDate: event.target.value })
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Efectivo · EUR</span>
            <Input
              required
              inputMode="decimal"
              value={values.cash}
              onChange={(event) =>
                setValues({
                  ...values,
                  cash: event.target.value.replace(",", ".")
                })
              }
            />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Comprueba los datos antes de guardar. Puedes corregir posiciones y
          fechas. Los importes están en EUR; las unidades admiten hasta seis
          decimales.
        </p>
        <div className="grid gap-5">
          {values.positions.map((row, index) => (
            <fieldset
              key={index}
              className="grid gap-3 border-b border-border pb-5"
            >
              <legend className="mb-2 text-sm font-medium">
                Posición {index + 1}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["name", "Producto"],
                    ["isin", "ISIN"],
                    ["quantity", "Unidades"],
                    ["price", "Precio por unidad · EUR"],
                    ["priceDate", "Fecha de cotización"],
                    ["value", "Valoración · EUR"]
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="grid gap-1">
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                    <Input
                      required
                      type={key === "priceDate" ? "date" : "text"}
                      inputMode={
                        key === "quantity" || key === "price" || key === "value"
                          ? "decimal"
                          : undefined
                      }
                      value={row[key]}
                      onChange={(event) =>
                        editPosition(
                          index,
                          key,
                          ["quantity", "price", "value"].includes(key)
                            ? event.target.value.replace(",", ".")
                            : key === "isin"
                              ? event.target.value.toUpperCase()
                              : event.target.value
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                onClick={() =>
                  setValues({
                    ...values,
                    positions: values.positions.filter((_, i) => i !== index)
                  })
                }
              >
                Quitar posición
              </Button>
            </fieldset>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          disabled={values.positions.length >= 500}
          onClick={() =>
            setValues({
              ...values,
              positions: [
                ...values.positions,
                {
                  name: "",
                  isin: "",
                  quantity: "",
                  price: "",
                  priceDate: values.reportDate,
                  value: ""
                }
              ]
            })
          }
        >
          Añadir posición
        </Button>
        <div className="grid gap-1 text-sm">
          <p>
            Inversiones:{" "}
            <strong>{formatImportAmount(summary.investments)}</strong>
          </p>
          <p>
            Patrimonio total:{" "}
            <strong>{formatImportAmount(summary.total)}</strong>
          </p>
          <p className="text-muted-foreground">
            PDF original: inversiones{" "}
            {formatImportAmount(review.draft.original.reportedInvestments)} ·
            total {formatImportAmount(review.draft.original.reportedTotal)}
          </p>
        </div>
        {summary.mismatch && (
          <p role="status" className="text-sm text-destructive">
            Los totales del PDF no cuadran con las posiciones leídas. Revisa y
            corrige los datos antes de confirmar.
          </p>
        )}
        {summary.changed && (
          <p role="status" className="text-sm text-muted-foreground">
            Guardarás datos corregidos respecto al PDF original.
          </p>
        )}
        {existing && reviewedDate === values.reportDate && (
          <label
            key={`${existing.revision}-${reviewedDate}`}
            className="flex items-start gap-3 text-sm"
          >
            <input type="checkbox" name="replace" required className="mt-1" />
            Ya existe una foto para esta fecha con inversiones de{" "}
            {formatImportAmount(existing.investments)}. Confirmo que quiero
            sustituirla por estos datos.
          </label>
        )}
        {!summary.valid && (
          <p role="status" className="text-sm text-destructive">
            Completa fechas, ISIN y números válidos antes de confirmar. No
            repitas un ISIN.
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button
          type="submit"
          disabled={!summary.valid}
          className="justify-self-start"
        >
          {pending ? "Guardando…" : "Confirmar y guardar foto"}
        </Button>
      </fieldset>
    </form>
  );
}
