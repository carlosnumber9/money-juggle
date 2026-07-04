type RequestHeaders = Pick<Headers, "get">;

const LOCALHOST_ORIGIN = "http://localhost:3000";

export function getRequestOrigin(headerStore: RequestHeaders): string {
  const forwardedHost = getFirstHeaderValue(headerStore, "x-forwarded-host");
  const host = forwardedHost ?? getFirstHeaderValue(headerStore, "host");

  if (host) {
    const protocol = getRequestProtocol(headerStore, host);

    return `${protocol}://${host}`;
  }

  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? LOCALHOST_ORIGIN;
}

function getRequestProtocol(
  headerStore: RequestHeaders,
  host: string
): "http" | "https" {
  const forwardedProtocol = getFirstHeaderValue(
    headerStore,
    "x-forwarded-proto"
  );

  if (forwardedProtocol === "http" || forwardedProtocol === "https") {
    return forwardedProtocol;
  }

  if (isLocalHost(host)) {
    return "http";
  }

  return "https";
}

function getFirstHeaderValue(
  headerStore: RequestHeaders,
  name: string
): string | null {
  const value = headerStore.get(name);

  return value?.split(",")[0]?.trim() || null;
}

function isLocalHost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}
