import { BANK_CONNECTION_STATUS_MESSAGES } from "@/definitions";

export type BankConnectionResult = {
  status: string;
  success: boolean;
  title: string;
  message: string;
};

export function getBankConnectionResult(
  value: string | string[] | undefined
): BankConnectionResult {
  const status = typeof value === "string" ? value : "callback-error";
  const success = status === "linked";

  return {
    status,
    success,
    title: success ? "Conexión completada" : "No se pudo completar la conexión",
    message:
      BANK_CONNECTION_STATUS_MESSAGES[status] ??
      BANK_CONNECTION_STATUS_MESSAGES["callback-error"]
  };
}
