import type { NextRequest } from "next/server";

import { handleStartRequest } from "./utils/startFlow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleStartRequest(request);
}
