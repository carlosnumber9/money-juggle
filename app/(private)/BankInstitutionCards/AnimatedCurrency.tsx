"use client";

import NumberFlow from "@number-flow/react";

export function AnimatedCurrency({
  amount,
  currency
}: {
  amount: string;
  currency: string;
}) {
  return (
    <NumberFlow
      value={Number(amount)}
      locales="es-ES"
      format={{
        style: "currency",
        currency
      }}
      className="tabular-nums"
    />
  );
}
