export function getTextValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => getTextValue(item))
      .filter((item): item is string => Boolean(item))
      .join(" ")
      .trim();

    return text || null;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function normalizeText(value: unknown): string {
  return (getTextValue(value) ?? "").replace(/\s+/g, " ").toLowerCase();
}
