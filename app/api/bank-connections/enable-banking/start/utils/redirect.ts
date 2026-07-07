import { NextResponse } from "next/server";

export function redirectWithStatus(requestUrl: URL, status: string) {
  return NextResponse.redirect(
    new URL(
      `/?bank_connection_status=${encodeURIComponent(status)}`,
      requestUrl.origin
    ),
    { status: 303 }
  );
}

export function getCallbackUrl(requestUrl: URL): string {
  return (
    process.env.ENABLE_BANKING_REDIRECT_URL ??
    new URL(
      "/api/bank-connections/enable-banking/callback",
      requestUrl.origin
    ).toString()
  );
}
