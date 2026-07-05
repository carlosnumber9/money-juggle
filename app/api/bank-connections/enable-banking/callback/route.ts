import { type NextRequest, NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import {
  completeEnableBankingConnection,
  failEnableBankingConnection,
  getLinkingConnectionByState
} from "@/lib/db/enable-banking-connections";
import {
  authorizeEnableBankingSession,
  EnableBankingRequestError,
  getEnableBankingErrorMetadata,
  getEnableBankingErrorStatus
} from "@/lib/enable-banking/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  if (isDemoMode()) {
    return redirectWithStatus(requestUrl, "linked");
  }

  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorDescription =
    requestUrl.searchParams.get("error_description");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithStatus(requestUrl, "login-required");
  }

  if (!isEmailAllowed(user.email)) {
    return redirectWithStatus(requestUrl, "not-allowed");
  }

  if (!state) {
    return redirectWithStatus(requestUrl, "missing-state");
  }

  try {
    const connection = await getLinkingConnectionByState({
      userId: user.id,
      state
    });

    if (!connection) {
      return redirectWithStatus(requestUrl, "invalid-state");
    }

    if (providerError) {
      await failEnableBankingConnection({
        userId: user.id,
        bankConnectionId: connection.id,
        providerStatus: providerError,
        message: "Enable Banking returned an authorization error.",
        metadata: {
          error: providerError,
          error_description: providerErrorDescription
        }
      });

      return redirectWithStatus(requestUrl, "provider-cancelled");
    }

    if (!code) {
      await failEnableBankingConnection({
        userId: user.id,
        bankConnectionId: connection.id,
        providerStatus: "missing-code",
        message:
          "Enable Banking callback did not include an authorization code."
      });

      return redirectWithStatus(requestUrl, "missing-code");
    }

    try {
      const session = await authorizeEnableBankingSession(code);
      await completeEnableBankingConnection({
        userId: user.id,
        bankConnectionId: connection.id,
        session
      });
    } catch (error) {
      await failEnableBankingConnection({
        userId: user.id,
        bankConnectionId: connection.id,
        providerStatus: getPublicErrorStatus(error),
        message: "Enable Banking session authorization failed.",
        metadata: getPublicErrorMetadata(error)
      });

      console.error(
        "Enable Banking session authorization failed",
        getPublicErrorMetadata(error)
      );

      return redirectWithStatus(requestUrl, getPublicErrorStatus(error));
    }

    return redirectWithStatus(requestUrl, "linked");
  } catch (error) {
    console.error(
      "Enable Banking callback failed",
      getPublicErrorMetadata(error)
    );

    return redirectWithStatus(requestUrl, getPublicErrorStatus(error));
  }
}

function redirectWithStatus(requestUrl: URL, status: string) {
  return NextResponse.redirect(
    new URL(
      `/?bank_connection_status=${encodeURIComponent(status)}`,
      requestUrl.origin
    )
  );
}

function getPublicErrorStatus(error: unknown): string {
  if (error instanceof EnableBankingRequestError) {
    return getEnableBankingErrorStatus(error);
  }

  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "server-config-error";
  }

  return "callback-error";
}

function getPublicErrorMetadata(error: unknown) {
  if (error instanceof EnableBankingRequestError) {
    return getEnableBankingErrorMetadata(error);
  }

  if (error instanceof Error) {
    return {
      message: error.message
    };
  }

  return {};
}
