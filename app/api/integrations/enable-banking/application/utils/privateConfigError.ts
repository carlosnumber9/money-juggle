export function isPrivateConfigurationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = getErrorCode(error);

  return (
    error.message.startsWith("Missing ") ||
    code === "ENOENT" ||
    code === "EACCES" ||
    code?.startsWith("ERR_OSSL_") ||
    error.message.includes("DECODER routines") ||
    error.message.includes("PEM routines") ||
    error.message.includes("bad decrypt")
  );
}

export function getErrorCode(error: Error): string | undefined {
  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : undefined;
}
