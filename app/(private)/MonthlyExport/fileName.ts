export function getDefaultReportName(month: string): string {
  return `Finanzas-${month}`;
}

export function getReportDownloadName(value: string): string | null {
  const name = value
    .trim()
    .replace(/(?:\.xlsx)+$/i, "")
    .trim();
  if (
    !name ||
    name.length > 120 ||
    name === "." ||
    name === ".." ||
    Array.from(name).some(
      (character) =>
        character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)
    )
  )
    return null;
  return `${name}.xlsx`;
}
