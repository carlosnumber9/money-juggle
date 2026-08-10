import { type NextRequest, NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { createLinkingEnableBankingConnection } from "@/lib/db/enableBankingConnections";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

import { createAuthorization } from "./createAuthorization";
import { getPublicErrorMetadata, getPublicErrorStatus } from "./errors";
import { findAspsp } from "./findAspsp";
import { getRequiredFormValue } from "./form";
import { getCallbackUrl, redirectWithStatus } from "./redirect";

export async function handleStartRequest(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const user = await getCurrentSupabaseUser();

  if (!user) {
    return redirectWithStatus(requestUrl, "login-required");
  }

  if (!isEmailAllowed(user.email)) {
    return redirectWithStatus(requestUrl, "not-allowed");
  }

  try {
    const formData = await request.formData();
    const aspsp = await findAspsp({
      name: getRequiredFormValue(formData, "aspspName"),
      country: getRequiredFormValue(formData, "country")
    });
    const callbackUrl = getCallbackUrl(requestUrl);
    const created = await createAuthorization({ user, aspsp, callbackUrl });

    await createLinkingEnableBankingConnection({
      userId: user.id,
      email: user.email ?? "",
      aspsp,
      state: created.state,
      redirectUrl: callbackUrl,
      requestedAccess: created.access,
      authorization: created.authorization
    });

    return NextResponse.redirect(created.authorization.url, { status: 303 });
  } catch (error) {
    console.error("Enable Banking start failed", getPublicErrorMetadata(error));

    return redirectWithStatus(requestUrl, getPublicErrorStatus(error));
  }
}
