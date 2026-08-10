const DECIMAL_SCALE = 6;
const DECIMAL_FACTOR = 1_000_000n;

export function parseDecimal(value: string): bigint {
  const trimmed = value.trim();

  if (!/^[+-]?\d+(?:\.\d{1,6})?$/.test(trimmed)) {
    throw new Error("Invalid decimal value.");
  }

  const sign = trimmed.startsWith("-") ? -1n : 1n;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [whole, fraction = ""] = unsigned.split(".");
  const normalizedFraction = fraction.padEnd(DECIMAL_SCALE, "0");

  return (
    sign * (BigInt(whole) * DECIMAL_FACTOR + BigInt(normalizedFraction || "0"))
  );
}

export function formatDecimal(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / DECIMAL_FACTOR;
  const fraction = (absolute % DECIMAL_FACTOR)
    .toString()
    .padStart(DECIMAL_SCALE, "0")
    .replace(/0+$/, "");

  return `${sign}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

export function sumDecimals(values: string[]): string {
  return formatDecimal(
    values.reduce((sum, value) => sum + parseDecimal(value), 0n)
  );
}
