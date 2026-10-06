"use client";

import type { ReactNode } from "react";
import { LoadingOverlay } from "../LoadingOverlay";

export function TransactionListLoading({
  loading,
  children
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <LoadingOverlay
      loading={loading}
      label="Listado de movimientos"
      loadingLabel="Cargando movimientos"
      className="rounded-lg bg-card"
    >
      {children}
    </LoadingOverlay>
  );
}
