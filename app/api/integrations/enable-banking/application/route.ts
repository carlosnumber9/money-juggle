import { NextResponse } from "next/server";

import { getBankingDataSource } from "@/lib/data/getBankingDataSource";

import { getApplicationErrorResponse } from "./utils/errorResponse";
import { getErrorMetadata } from "./utils/errorMetadata";
import { getApplicationSuccessResponse } from "./utils/successResponse";

export const runtime = "nodejs";

export async function GET() {
  const dataSource = getBankingDataSource();
  const user = await dataSource.getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "Necesitas iniciar sesión." },
      { status: 401 }
    );
  }

  if (!user.isAllowed) {
    return NextResponse.json(
      { ok: false, reason: "Este email no está autorizado." },
      { status: 403 }
    );
  }

  try {
    return await getApplicationSuccessResponse(dataSource);
  } catch (error) {
    console.error(
      "Enable Banking application check failed",
      getErrorMetadata(error)
    );

    return getApplicationErrorResponse(error);
  }
}
