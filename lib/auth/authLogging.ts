import "server-only";

type AuthLogLevel = "info" | "warn" | "error";

type AuthLogDetails = Record<string, unknown>;

export function createAuthLogId(): string {
  return crypto.randomUUID();
}

export function logAuthEvent(
  level: AuthLogLevel,
  message: string,
  details: AuthLogDetails = {}
) {
  const payload = {
    area: "auth",
    ...details
  };

  if (level === "error") {
    console.error(message, payload);
    return;
  }

  if (level === "warn") {
    console.warn(message, payload);
    return;
  }

  console.info(message, payload);
}

export function maskEmail(email: string): string {
  const [localPart = "", domain = ""] = email.split("@");

  if (!localPart || !domain) {
    return "invalid-email-format";
  }

  const visiblePrefix = localPart.slice(0, 2);
  const maskedLocalPart =
    localPart.length <= 2 ? `${visiblePrefix}***` : `${visiblePrefix}***`;

  return `${maskedLocalPart}@${domain}`;
}

export function sanitizeAuthError(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      message: error instanceof Error ? error.message : "Unknown error."
    };
  }

  const authError = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    code?: unknown;
  };

  return {
    name: typeof authError.name === "string" ? authError.name : undefined,
    message:
      typeof authError.message === "string"
        ? authError.message
        : "Unknown error.",
    status: typeof authError.status === "number" ? authError.status : undefined,
    code: typeof authError.code === "string" ? authError.code : undefined
  };
}
