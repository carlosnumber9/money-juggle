import "server-only";

function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAllowedEmails(): string[] {
  return Array.from(
    new Set([
      ...parseEmailList(process.env.ALLOWED_EMAILS),
      ...parseEmailList(process.env.OWNER_EMAIL)
    ])
  );
}

export function hasAllowedEmails(): boolean {
  return getAllowedEmails().length > 0;
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return getAllowedEmails().includes(normalizeEmail(email));
}
