"use client";

import { CircleAlertIcon, WifiIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";

type ConnectionState =
  | { status: "loading" }
  | { status: "success"; applicationName: string }
  | { status: "error"; reason: string };

type EnableBankingResponse =
  | {
      ok: true;
      application: {
        name: string;
      };
    }
  | {
      ok: false;
      reason: string;
    };

export function EnableBankingStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "loading"
  });

  useEffect(() => {
    let isActive = true;

    async function checkConnection() {
      try {
        const response = await fetch(
          "/api/integrations/enable-banking/application"
        );
        const data = (await response.json()) as EnableBankingResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !data.ok) {
          setConnectionState({
            status: "error",
            reason:
              !data.ok && data.reason
                ? data.reason
                : "No se pudo comprobar la conexión."
          });
          return;
        }

        setConnectionState({
          status: "success",
          applicationName: data.application.name
        });
      } catch {
        if (!isActive) {
          return;
        }

        setConnectionState({
          status: "error",
          reason: "No se pudo contactar con el servidor."
        });
      }
    }

    void checkConnection();

    return () => {
      isActive = false;
    };
  }, []);

  if (connectionState.status === "loading") {
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

  if (connectionState.status === "error") {
    return (
      <Tooltip
        triggerLabel={`No se pudo conectar con Enable Banking. ${connectionState.reason}`}
        label={
          <>
            No se pudo conectar con Enable Banking.
            <br />
            {connectionState.reason}
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
      triggerLabel={`Conexión viva con Enable Banking. Aplicación verificada: ${connectionState.applicationName}`}
      label={`Conexión viva con Enable Banking. Aplicación verificada: ${connectionState.applicationName}.`}
      triggerClassName="text-green-700 hover:bg-green-50"
    >
      <WifiIcon className="size-5" aria-hidden />
    </Tooltip>
  );
}
