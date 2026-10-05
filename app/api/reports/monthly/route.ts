import { NextResponse } from "next/server";

import { bankingDataSource } from "@/lib/data/bankingDataSource";
import { buildMonthlyExportReport } from "@/lib/reports/monthlyExport/buildReport";
import { getExportPeriod } from "@/lib/reports/monthlyExport/period";
import { writeMonthlyWorkbook } from "@/lib/reports/monthlyExport/writeWorkbook";

export const runtime = "nodejs";
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff"
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

export async function POST(request: Request) {
  try {
    const user = await bankingDataSource.getCurrentUser();
    if (!user) return errorResponse("login-required", 401);
    if (!user.isAllowed) return errorResponse("not-allowed", 403);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("invalid-month", 400);
    }
    const generatedAt = new Date();
    const period = getExportPeriod(
      body && typeof body === "object" && "month" in body ? body.month : null,
      generatedAt
    );
    if (!period) return errorResponse("invalid-month", 400);
    const data = await bankingDataSource.getMonthlyReportData(
      user.id,
      period.range
    );
    const report = buildMonthlyExportReport(data, period.value, generatedAt);
    const buffer = await writeMonthlyWorkbook(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Finanzas-${period.value}.xlsx"`
      }
    });
  } catch {
    console.error("Monthly financial export failed.");
    return errorResponse("monthly-export-failed", 500);
  }
}
