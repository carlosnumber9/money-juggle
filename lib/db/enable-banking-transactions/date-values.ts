import { getTextValue } from "./text-values";

export function getDate(value: unknown): string | null {
  const text = getTextValue(value);

  return text ? text.slice(0, 10) : null;
}

export function getDateTime(value: unknown): string | null {
  const text = getTextValue(value);

  return text?.includes("T") ? text : null;
}

export function getLast4(value: unknown): string | null {
  const normalized = getTextValue(value)?.replace(/[^A-Za-z0-9]/g, "");

  if (!normalized || normalized.length < 4) {
    return null;
  }

  return normalized.slice(-4);
}
