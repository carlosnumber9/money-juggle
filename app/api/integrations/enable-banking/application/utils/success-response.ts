import { NextResponse } from "next/server";

import type { BankingDataSource } from "@/definitions";

export async function getApplicationSuccessResponse(
  dataSource: BankingDataSource
) {
  const application = await dataSource.getProviderApplication();

  return NextResponse.json({
    ok: true,
    application: {
      name: application.name,
      kid: application.kid,
      environment: application.environment,
      active: application.active,
      countries: application.countries,
      services: application.services,
      mode: dataSource.mode
    }
  });
}
