import { NextResponse } from "next/server";

export function redirectWithStatus(requestUrl: URL, status: string) {
  return NextResponse.redirect(
    new URL(
      `/bank-connection-result?status=${encodeURIComponent(status)}`,
      requestUrl.origin
    )
  );
}
