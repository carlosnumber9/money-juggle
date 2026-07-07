export function getSuffix(value: string | null | undefined): string | null {
  return value ? value.slice(-8) : null;
}
