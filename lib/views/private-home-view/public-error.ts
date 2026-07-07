export function getPublicErrorReason(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "Falta configuración privada en el servidor.";
  }

  return fallback;
}
