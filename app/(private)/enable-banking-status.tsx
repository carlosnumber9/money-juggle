"use client";

import { CircleAlertIcon, WifiIcon } from "lucide-react";

import type { EnableBankingStatusProps } from "@/definitions";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";

export function EnableBankingStatus({ status }: EnableBankingStatusProps) {
  if (status.status === "loading") {
    return (
      <Tooltip
        triggerLabel="Comprobando conexión firmada con Enable Banking"
        label="Comprobando conexión firmada con Enable Banking."
        triggerClassName="text-muted-foreground"
      >
        <Spinner aria-hidden />
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
        triggerClassName="text-destructive hover:bg-destructive/10"
      >
        <CircleAlertIcon className="size-5" aria-hidden />
      </Tooltip>
    );
  }

  return (
    <Tooltip
      triggerLabel={`${status.isDemo ? "Modo demo local" : "Conexión viva con Enable Banking"}. Aplicación verificada: ${status.applicationName}`}
      label={`${status.isDemo ? "Modo demo local activo" : "Conexión viva con Enable Banking"}. Aplicación verificada: ${status.applicationName}.`}
      triggerClassName="text-primary hover:bg-muted"
    >
      <WifiIcon className="size-5" aria-hidden />
    </Tooltip>
  );
}
