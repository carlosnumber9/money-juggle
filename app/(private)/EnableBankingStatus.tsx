"use client";

import { CircleAlertIcon, WifiIcon } from "lucide-react";

import type { EnableBankingStatusProps } from "@/definitions";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";

const statusTriggerClassName =
  "size-auto shrink-0 border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-ring/30";

export function EnableBankingStatus({ status }: EnableBankingStatusProps) {
  if (status.status === "loading") {
    return (
      <Tooltip
        triggerLabel="Comprobando conexión firmada con Enable Banking"
        label="Comprobando conexión firmada con Enable Banking."
        triggerClassName={`${statusTriggerClassName} text-muted-foreground`}
      >
        <Spinner className="size-7" aria-hidden />
      </Tooltip>
    );
  }

  if (status.status === "error") {
    return (
      <Tooltip
        triggerLabel={`No se pudo conectar con Enable Banking. ${status.reason}`}
        label={
          <>
            No se pudo conectar con Enable Banking.
            <br />
            {status.reason}
          </>
        }
        triggerClassName={`${statusTriggerClassName} text-destructive`}
      >
        <CircleAlertIcon className="size-7" aria-hidden />
      </Tooltip>
    );
  }

  const checkedAt = status.checkedAt
    ? new Intl.DateTimeFormat("es-ES", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Europe/Madrid"
      }).format(new Date(status.checkedAt))
    : null;
  const label = `Aplicación verificada: ${status.applicationName}.${checkedAt ? ` Última comprobación: ${checkedAt}.` : ""} Estado informativo; puede reutilizarse durante cinco minutos.`;
  return (
    <Tooltip
      triggerLabel={label}
      label={label}
      triggerClassName={`${statusTriggerClassName} text-primary`}
    >
      <WifiIcon className="size-7" aria-hidden />
    </Tooltip>
  );
}
