export async function requestMonthlyWorkbook(
  month: string,
  signal: AbortSignal
): Promise<Blob> {
  const response = await fetch("/api/reports/monthly", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month }),
    signal
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Tu sesión no permite exportar. Vuelve a iniciar sesión.");
  }
  if (response.status === 400)
    throw new Error("Selecciona un mes válido que no sea futuro.");
  if (
    !response.ok ||
    !response.headers
      .get("Content-Type")
      ?.startsWith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
  ) {
    throw new Error("No se pudo generar el informe. Reinténtalo más tarde.");
  }
  const blob = await response.blob();
  if (blob.size === 0)
    throw new Error("El informe recibido está vacío. Reinténtalo más tarde.");
  return blob;
}

export function saveMonthlyWorkbook(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
