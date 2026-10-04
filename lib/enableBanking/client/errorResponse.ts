import type { EnableBankingErrorResponse } from "@/definitions";

export async function readEnableBankingError(
  response: Response
): Promise<EnableBankingErrorResponse | undefined> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json().catch(() => undefined)) as unknown;

    return normalizeEnableBankingError(data);
  }

  const text = await response.text().catch(() => "");

  if (!text) {
    return undefined;
  }

  return {
    message: text.slice(0, 500),
    code: response.status
  };
}

function normalizeEnableBankingError(
  value: unknown
): EnableBankingErrorResponse | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const error = typeof record.error === "string" ? record.error : undefined;
  const message = typeof record.message === "string" ? record.message : "";

  if (!message && !error) {
    return undefined;
  }

  return {
    message: message || "Enable Banking request failed.",
    code: typeof record.code === "number" ? record.code : undefined,
    error,
    detail: record.detail
  };
}
