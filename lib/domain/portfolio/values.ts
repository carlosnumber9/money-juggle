import type { PortfolioPosition, PortfolioValues } from "@/definitions";
import { formatDecimal, parseDecimal, sumDecimals } from "@/lib/domain/decimal";

export const MAX_PORTFOLIO_POSITIONS = 500;

export class PortfolioValidationError extends Error {
  constructor() {
    super("Invalid portfolio values.");
  }
}

function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new PortfolioValidationError();
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new PortfolioValidationError();
  return value;
}

function decimal(value: unknown, nonnegative = true): string {
  if (typeof value !== "string" || value.length > 24)
    throw new PortfolioValidationError();
  try {
    const amount = parseDecimal(value);
    if (
      (nonnegative && amount < 0n) ||
      amount >= 100_000_000_000_000n * 1_000_000n ||
      amount <= -100_000_000_000_000n * 1_000_000n
    )
      throw new PortfolioValidationError();
    return formatDecimal(amount);
  } catch {
    throw new PortfolioValidationError();
  }
}

function position(value: unknown, reportDate: string): PortfolioPosition {
  if (!value || typeof value !== "object") throw new PortfolioValidationError();
  const row = value as Record<string, unknown>;
  if (
    typeof row.name !== "string" ||
    !row.name.trim() ||
    row.name.length > 250 ||
    typeof row.isin !== "string" ||
    !/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(row.isin)
  )
    throw new PortfolioValidationError();
  const priceDate = date(row.priceDate);
  if (priceDate > reportDate) throw new PortfolioValidationError();
  return {
    name: row.name.trim(),
    isin: row.isin,
    quantity: decimal(row.quantity),
    price: decimal(row.price),
    priceDate,
    value: decimal(row.value)
  };
}

export function validatePortfolioValues(value: unknown): PortfolioValues {
  if (!value || typeof value !== "object") throw new PortfolioValidationError();
  const input = value as Record<string, unknown>;
  const reportDate = date(input.reportDate);
  if (
    input.currency !== "EUR" ||
    !Array.isArray(input.positions) ||
    input.positions.length > MAX_PORTFOLIO_POSITIONS
  )
    throw new PortfolioValidationError();
  const positions = input.positions.map((row) => position(row, reportDate));
  if (new Set(positions.map((row) => row.isin)).size !== positions.length)
    throw new PortfolioValidationError();
  const cash = decimal(input.cash, false);
  decimal(sumDecimals(positions.map((row) => row.value)));
  return { reportDate, currency: "EUR", cash, positions };
}

export function portfolioInvestments(values: PortfolioValues): string {
  return sumDecimals(values.positions.map((position) => position.value));
}
