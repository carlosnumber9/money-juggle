const DECIMAL_SCALE = 6;
const DECIMAL_FACTOR = 1_000_000n;

export function parseDecimal(value: string): bigint {
  const trimmed = value.trim();
  const sign = trimmed.startsWith("-") ? -1n : 1n;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const normalizedFraction = fraction
    .padEnd(DECIMAL_SCALE, "0")
    .slice(0, DECIMAL_SCALE);

  return (
    sign *
    (BigInt(whole || "0") * DECIMAL_FACTOR + BigInt(normalizedFraction || "0"))
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
