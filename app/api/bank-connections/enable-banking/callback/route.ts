import { type NextRequest, NextResponse } from "next/server";

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

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  console.info("Enable Banking callback received", {
    origin: requestUrl.origin,
    path: requestUrl.pathname
  });

  if (isDemoMode()) {
    console.info("Enable Banking callback skipped in demo mode");

    return redirectWithStatus(requestUrl, "linked");
  }

  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorDescription =
    requestUrl.searchParams.get("error_description");

  console.info("Enable Banking callback parameters checked", {
    has_state: Boolean(state),
    state_suffix: getSuffix(state),
    has_code: Boolean(code),
    has_provider_error: Boolean(providerError),
    provider_error: providerError
  });

  if (!state) {
    return redirectWithStatus(requestUrl, "missing-state");
  }

  try {
    const connection = await getLinkingConnectionByState({
      state
    });

    if (!connection) {
      console.warn("Enable Banking callback state not found", {
        state_suffix: getSuffix(state)
      });

      return redirectWithStatus(requestUrl, "invalid-state");
    }

    console.info("Enable Banking callback connection found", {
      bank_connection_id_suffix: getSuffix(connection.id),
      user_id_suffix: getSuffix(connection.user_id),
      state_suffix: getSuffix(state),
      status: connection.status
    });

    if (providerError) {
      await failEnableBankingConnection({
        userId: connection.user_id,
        bankConnectionId: connection.id,
        providerStatus: providerError,
        message: "Enable Banking returned an authorization error.",
        metadata: {
          error: providerError,
          error_description: providerErrorDescription
        }
      });

      console.warn("Enable Banking callback provider error stored", {
        bank_connection_id_suffix: getSuffix(connection.id),
        user_id_suffix: getSuffix(connection.user_id),
        provider_error: providerError
      });

      return redirectWithStatus(requestUrl, "provider-cancelled");
    }

    if (!code) {
      await failEnableBankingConnection({
        userId: connection.user_id,
        bankConnectionId: connection.id,
        providerStatus: "missing-code",
        message:
          "Enable Banking callback did not include an authorization code."
      });

      console.warn("Enable Banking callback missing code stored", {
        bank_connection_id_suffix: getSuffix(connection.id),
        user_id_suffix: getSuffix(connection.user_id)
      });

      return redirectWithStatus(requestUrl, "missing-code");
    }

    try {
      const session = await authorizeEnableBankingSession(code);

      console.info("Enable Banking session authorized", {
        bank_connection_id_suffix: getSuffix(connection.id),
        user_id_suffix: getSuffix(connection.user_id),
        session_id_suffix: getSuffix(session.session_id),
        account_count: session.accounts.length
      });

      await completeEnableBankingConnection({
        userId: connection.user_id,
        bankConnectionId: connection.id,
        session
      });

      console.info("Enable Banking callback completed", {
        bank_connection_id_suffix: getSuffix(connection.id),
        user_id_suffix: getSuffix(connection.user_id),
        account_count: session.accounts.length
      });
    } catch (error) {
      await failEnableBankingConnection({
        userId: connection.user_id,
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

function getSuffix(value: string | null | undefined): string | null {
  return value ? value.slice(-8) : null;
}
