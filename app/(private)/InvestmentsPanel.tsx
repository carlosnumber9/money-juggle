import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { InvestmentsView } from "@/definitions";
import { AnimatedCurrency } from "./BankInstitutionCards/AnimatedCurrency";
import { ChartContainer } from "./MonthlyEvolutionPanel/ChartContainer";
import { PortfolioHistoryChart } from "./InvestmentsPanel/PortfolioHistoryChart";
import {
  formatPortfolioDate,
  formatPositionUnits
} from "./InvestmentsPanel/formatters";

export function InvestmentsPanel({ view }: { view: InvestmentsView }) {
  return (
    <section className="grid gap-6" aria-label="Inversiones">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Tu portfolio</h2>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/investments/import"
        >
          Importar PDF
        </Link>
      </div>
      {view.error && (
        <p role="alert" className="text-sm text-destructive">
          {view.error}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <CardContent className="p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Trade Republic</h3>
            {view.latest ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Foto del {formatPortfolioDate(view.latest.reportDate)}
                </p>
                <p className="mt-4 text-2xl font-semibold">
                  <AnimatedCurrency
                    amount={view.latest.investments}
                    currency="EUR"
                  />
                </p>
                <ul className="mt-5 divide-y divide-border">
                  {view.latest.positions.map((position) => (
                    <li
                      key={position.isin}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{position.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {position.isin} ·{" "}
                          {formatPositionUnits(position.quantity)} unidades
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium">
                        <AnimatedCurrency
                          amount={position.value}
                          currency="EUR"
                        />
                      </span>
                    </li>
                  ))}
                </ul>
                {view.latest.positions.length === 0 && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Esta foto no contiene posiciones.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {view.error
                  ? "Portfolio no disponible."
                  : "Todavía no has importado ninguna foto. Sube un PDF para ver tus posiciones."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <ChartContainer
        title="Evolución del patrimonio"
        description="Efectivo e inversiones según tus PDFs. Cada punto corresponde a una foto confirmada."
      >
        {view.points.length ? (
          <PortfolioHistoryChart points={view.points} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {view.error
              ? "Histórico no disponible."
              : "El histórico aparecerá al confirmar tu primera importación."}
          </p>
        )}
      </ChartContainer>
    </section>
  );
}
