import type { NextRequest } from "next/server";

import { getLinkingConnectionByState } from "@/lib/db/enableBankingConnections";

import { authorizeAndCompleteSession } from "./authorizeSession";
import { getPublicErrorMetadata, getPublicErrorStatus } from "./errors";
import { getCallbackParams } from "./params";
import { storeMissingCode, storeProviderError } from "./providerFailure";
import { redirectWithStatus } from "./redirect";

export async function handleCallbackRequest(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const params = getCallbackParams(requestUrl);

  if (!params.state) {
    return redirectWithStatus(requestUrl, "missing-state");
  }

  try {
    const connection = await getLinkingConnectionByState({
      state: params.state
    });

    if (!connection) {
      return redirectWithStatus(requestUrl, "invalid-state");
    }

    if (params.providerError) {
      await storeProviderError({
        connection,
        providerError: params.providerError,
        providerErrorDescription: params.providerErrorDescription
      });
      return redirectWithStatus(requestUrl, "provider-cancelled");
    }

    if (!params.code) {
      await storeMissingCode(connection);
      return redirectWithStatus(requestUrl, "missing-code");
    }

    const result = await authorizeAndCompleteSession({
      connection,
      code: params.code,
      requestHeaders: request.headers
    });

    return redirectWithStatus(requestUrl, result.ok ? "linked" : result.status);
  } catch (error) {
    console.error(
      "Enable Banking callback failed",
      getPublicErrorMetadata(error)
    );

    return redirectWithStatus(requestUrl, getPublicErrorStatus(error));
  }
}
