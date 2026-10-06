import { NextRequest, NextResponse } from "next/server";

import { bankingDataSource } from "@/lib/data/bankingDataSource";
import { getTransactionMonthView } from "@/lib/views/transactionMonthView";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const user = await bankingDataSource.getCurrentUser();
  if (!user)
    return NextResponse.json(
      { reason: "Inicia sesión de nuevo." },
      { status: 401, headers }
    );
  if (!user.isAllowed)
    return NextResponse.json(
      { reason: "Acceso no permitido." },
      { status: 403, headers }
    );
  const data = await getTransactionMonthView(
    user.id,
    request.nextUrl.searchParams.get("month") ?? undefined
  );
  if (data.error)
    return NextResponse.json({ reason: data.error }, { status: 500, headers });
  return NextResponse.json({ data }, { headers });
}
