import { NextResponse } from "next/server";

export function redirectWithStatus(
  requestUrl: URL,
  status: string,
  bankConnectionId?: string
) {
  const query = new URLSearchParams({ status });
  if (bankConnectionId) query.set("connection", bankConnectionId);
  return NextResponse.redirect(
    new URL(`/bank-connection-result?${query}`, requestUrl.origin)
  );
}
