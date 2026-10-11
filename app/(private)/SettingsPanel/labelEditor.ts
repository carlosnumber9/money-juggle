import type { TransactionLabelSummary } from "@/definitions";
import {
  cleanTransactionLabelName,
  isValidTransactionLabelName
} from "@/lib/domain/labels";

export function resolveLabelNameEdit(
  previousName: string,
  draft: string
):
  { kind: "unchanged" } | { kind: "invalid" } | { kind: "save"; name: string } {
  const name = cleanTransactionLabelName(draft);
  if (!name || name === previousName) return { kind: "unchanged" };
  if (!isValidTransactionLabelName(name)) return { kind: "invalid" };
  return { kind: "save", name };
}

export function sortSettingsLabels(labels: TransactionLabelSummary[]) {
  return [...labels].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function replaceSettingsLabel(
  labels: TransactionLabelSummary[],
  label: TransactionLabelSummary
) {
  return sortSettingsLabels([
    ...labels.filter((item) => item.id !== label.id),
    label
  ]);
}
