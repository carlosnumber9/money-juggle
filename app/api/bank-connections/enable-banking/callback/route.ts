import type { NextRequest } from "next/server";

import { handleCallbackRequest } from "./utils/callback-flow";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleCallbackRequest(request);
}
