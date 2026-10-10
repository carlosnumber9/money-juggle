import type {
  BankProgressReason,
  DashboardProgressEvent,
  InitialLoadPhase,
  ProgressRow,
  ProgressStatus
} from "@/definitions";

export function buildInitialLoadRows(
  states: Partial<
    Record<InitialLoadPhase | "mounted" | "layout", ProgressStatus>
  >,
  tab: string | null
): ProgressRow[] {
  const dataDetail =
    tab === "transactions"
      ? "Cargando movimientos, categorías y etiquetas"
      : tab === "evolution"
        ? "Cargando datos del mes y del año"
        : "Cargando cuentas, saldos y movimientos";
  const prepareDetail =
    tab === "transactions"
      ? "Preparando el listado de movimientos"
      : tab === "evolution"
        ? "Preparando gráficos y resúmenes"
        : "Calculando ingresos y gastos";
  const phases = ["session", "data", "prepared", "mounted"] as const;
  const labels = [
    "Validar sesión",
    "Cargar datos del panel",
    "Preparar panel",
    "Mostrar panel"
  ];
  const active = [
    "Comprobando tu acceso",
    dataDetail,
    prepareDetail,
    "Mostrando tu información"
  ];
  const done = [
    "Acceso verificado",
    "Datos cargados",
    "Panel preparado",
    "Panel listo"
  ];
  const firstPending = phases.findIndex((phase) => !states[phase]);
  return phases.map((phase, index) => {
    const status =
      states[phase] ?? (index === firstPending ? "running" : "pending");
    return {
      id: phase,
      label: labels[index],
      status,
      detail:
        status === "warning"
          ? "Algunos datos no se pudieron cargar"
          : status === "error"
            ? "No se pudo cargar el panel"
            : status === "completed"
              ? phase === "mounted" && states.data === "warning"
                ? "Panel listo con avisos"
                : done[index]
              : status === "running"
                ? active[index]
                : "Pendiente"
    };
  });
}

export function createDashboardProgress(): ProgressRow[] {
  return [
    {
      id: "connections",
      label: "Comprobar conexiones",
      status: "running",
      detail: "Comprobando qué cuentas se pueden actualizar"
    },
    {
      id: "balances",
      label: "Actualizar saldos",
      status: "pending",
      children: []
    },
    {
      id: "transactions",
      label: "Actualizar movimientos",
      status: "pending",
      children: []
    },
    { id: "view", label: "Actualizar panel", status: "pending" }
  ];
}

const reasonDetails: Record<BankProgressReason, string> = {
  fresh: "Ya estaban actualizados",
  deferred: "Actualización aplazada",
  expired: "Es necesario reconectar el banco",
  unavailable: "Sin cuentas disponibles para actualizar",
  busy: "Otra actualización sigue en curso",
  partial: "Actualización incompleta",
  failure: "No se pudo completar la actualización",
  persisting: "Guardando datos"
};

export function applyDashboardProgress(
  rows: ProgressRow[],
  event: DashboardProgressEvent
): ProgressRow[] {
  return rows.map((row) => {
    if (
      event.type === "banks" &&
      (row.id === "balances" || row.id === "transactions")
    )
      return {
        ...row,
        children: event.banks.map((bank) => ({
          id: bank.id,
          label: bank.name,
          status: "pending"
        }))
      };
    if (event.type === "bank" && row.id === event.resource) {
      const children = (row.children ?? []).map((child) =>
        child.id === event.bankConnectionId
          ? {
              ...child,
              status: event.status,
              detail:
                event.reason === "persisting"
                  ? `Guardando datos de ${child.label}`
                  : event.reason
                    ? reasonDetails[event.reason]
                    : event.status === "running"
                      ? `Consultando ${child.label}`
                      : "Actualización completada"
            }
          : child
      );
      return { ...row, children };
    }
    if (event.type === "phase" && row.id === event.phase) {
      const children = row.children ?? [];
      const warning = children.some(
        (child) => child.status === "warning" || child.status === "error"
      );
      const allFailed =
        children.length > 0 &&
        children.every((child) => child.status === "error");
      const mixedFresh = children.some(
        (child) => child.detail === reasonDetails.fresh
      );
      const allFresh =
        children.length > 0 &&
        children.every((child) => child.detail === reasonDetails.fresh);
      return {
        ...row,
        status:
          event.status === "completed" && allFailed
            ? "error"
            : event.status === "completed" && warning
              ? "warning"
              : event.status,
        detail:
          event.status === "running"
            ? "Comprobando si necesitan actualización"
            : row.id === "connections"
              ? "Comprobación completada"
              : allFailed
                ? reasonDetails.failure
                : warning
                  ? "Actualización completada con avisos"
                  : allFresh
                    ? "Ya estaban actualizados"
                    : children.length === 0
                      ? "Sin cuentas disponibles para actualizar"
                      : mixedFresh
                        ? "Actualización completada"
                        : row.id === "balances"
                          ? "Saldos actualizados"
                          : "Movimientos actualizados"
      };
    }
    return row;
  });
}

export function setViewProgress(
  rows: ProgressRow[],
  status: ProgressStatus
): ProgressRow[] {
  return rows.map((row) =>
    row.id === "view"
      ? {
          ...row,
          status,
          detail:
            status === "completed"
              ? "Panel actualizado"
              : "Mostrando los datos disponibles"
        }
      : row
  );
}

export function failDashboardProgress(rows: ProgressRow[]): ProgressRow[] {
  return rows.map((row) => ({
    ...row,
    status:
      row.status === "running"
        ? "error"
        : row.status === "pending"
          ? "skipped"
          : row.status,
    detail:
      row.status === "running"
        ? reasonDetails.failure
        : row.status === "pending"
          ? "Actualización interrumpida"
          : row.detail,
    children: row.children?.map((child) =>
      child.status === "running" || child.status === "pending"
        ? { ...child, status: "error", detail: reasonDetails.failure }
        : child
    )
  }));
}
