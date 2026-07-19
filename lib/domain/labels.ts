import type { TransactionLabelSummary } from "@/definitions";

export const MAX_TRANSACTION_LABEL_LENGTH = 80;

export function cleanTransactionLabelName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTransactionLabelName(value: string): string {
  return cleanTransactionLabelName(value).toLocaleLowerCase("es");
}

export function isValidTransactionLabelName(value: string): boolean {
  const name = cleanTransactionLabelName(value);

  return name.length > 0 && name.length <= MAX_TRANSACTION_LABEL_LENGTH;
}

export function filterAvailableTransactionLabels(
  labels: TransactionLabelSummary[],
  assignedLabels: TransactionLabelSummary[],
  searchValue: string
): TransactionLabelSummary[] {
  const assignedIds = new Set(assignedLabels.map((label) => label.id));
  const normalizedSearch = normalizeTransactionLabelName(searchValue);

  return labels.filter(
    (label) =>
      !assignedIds.has(label.id) &&
      normalizeTransactionLabelName(label.name).includes(normalizedSearch)
  );
}

export function findExactTransactionLabel(
  labels: TransactionLabelSummary[],
  value: string
): TransactionLabelSummary | null {
  const normalizedValue = normalizeTransactionLabelName(value);

  return (
    labels.find(
      (label) => normalizeTransactionLabelName(label.name) === normalizedValue
    ) ?? null
  );
}

export function getTransactionLabelSummaryText(
  labels: TransactionLabelSummary[]
): string | null {
  const firstLabel = labels[0];

  if (!firstLabel) {
    return null;
  }

  const additionalCount = labels.length - 1;

  return additionalCount > 0
    ? `${firstLabel.name} +${additionalCount}`
    : firstLabel.name;
}
