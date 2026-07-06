import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { DEFAULT_CONSENT_SECONDS } from "@/definitions";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import {
  createLinkingEnableBankingConnection,
  getEnableBankingInstitutionProviderId
} from "@/lib/db/enable-banking-connections";
import {
  EnableBankingRequestError,
  getEnableBankingErrorMetadata,
  getEnableBankingErrorStatus,
  getEnableBankingAspsps,
  startEnableBankingAuthorization
} from "@/lib/enable-banking/client";
import { getCurrentSupabaseUser } from "@/lib/supabase/current-user";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);

  console.info("Enable Banking start requested", {
    origin: requestUrl.origin,
    path: requestUrl.pathname
  });

  if (isDemoMode()) {
    console.info("Enable Banking start skipped in demo mode");

    return redirectWithStatus(requestUrl, "linked");
  }

  const user = await getCurrentSupabaseUser();

  if (!user) {
    console.warn("Enable Banking start rejected", {
      reason: "login-required"
    });

    return redirectWithStatus(requestUrl, "login-required");
  }

  if (!isEmailAllowed(user.email)) {
    console.warn("Enable Banking start rejected", {
      reason: "not-allowed",
      user_id_suffix: getSuffix(user.id),
      has_email: Boolean(user.email)
    });

    return redirectWithStatus(requestUrl, "not-allowed");
  }

  try {
    const formData = await request.formData();
    const aspspName = getRequiredFormValue(formData, "aspspName");
    const country = getRequiredFormValue(formData, "country");

    console.info("Enable Banking start form parsed", {
      user_id_suffix: getSuffix(user.id),
      aspsp_name: aspspName,
      country
    });

    const aspsp = await findAspsp({ name: aspspName, country });
    const state = randomUUID();
    const callbackUrl = getCallbackUrl(requestUrl);
    const access = {
      balances: true,
      transactions: true,
      valid_until: getConsentValidUntil(aspsp.maximum_consent_validity)
    };
    const authorization = await startEnableBankingAuthorization({
      access,
      aspsp: {
        name: aspsp.name,
        country: aspsp.country
      },
      state,
      redirect_url: callbackUrl,
      psu_type: "personal",
      language: "es",
      psu_id: user.id
    });

    console.info("Enable Banking authorization created", {
      user_id_suffix: getSuffix(user.id),
      aspsp_name: aspsp.name,
      country: aspsp.country,
      state_suffix: getSuffix(state),
      authorization_id_suffix: getSuffix(authorization.authorization_id),
      has_redirect_url: Boolean(authorization.url),
      has_authorization_access: Boolean(authorization.access)
    });

    await createLinkingEnableBankingConnection({
      userId: user.id,
      email: user.email ?? "",
      aspsp,
      state,
      redirectUrl: callbackUrl,
      requestedAccess: access,
      authorization
    });

    console.info("Enable Banking linking connection persisted", {
      user_id_suffix: getSuffix(user.id),
      state_suffix: getSuffix(state),
      authorization_id_suffix: getSuffix(authorization.authorization_id)
    });

    return NextResponse.redirect(authorization.url, { status: 303 });
  } catch (error) {
    console.error("Enable Banking start failed", getPublicErrorMetadata(error));

    const status = encodeURIComponent(getPublicErrorStatus(error));

    return NextResponse.redirect(
      new URL(`/?bank_connection_status=${status}`, requestUrl.origin),
      { status: 303 }
    );
  }
}

async function findAspsp({ name, country }: { name: string; country: string }) {
  const aspsps = await getEnableBankingAspsps({
    country,
    psuType: "personal",
    service: "AIS"
  });
  const providerId = getEnableBankingInstitutionProviderId({ name, country });
  const aspsp = aspsps.find(
    (candidate) =>
      getEnableBankingInstitutionProviderId(candidate) === providerId
  );

  if (!aspsp) {
    throw new Error("Unsupported ASPSP.");
  }

  return aspsp;
}

function getRequiredFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${name}.`);
  }

  return value.trim();
}

function getCallbackUrl(requestUrl: URL): string {
  return (
    process.env.ENABLE_BANKING_REDIRECT_URL ??
    new URL(
      "/api/bank-connections/enable-banking/callback",
      requestUrl.origin
    ).toString()
  );
}

function getConsentValidUntil(maximumConsentValidity: number): string {
  const seconds = Math.min(maximumConsentValidity, DEFAULT_CONSENT_SECONDS);

  return new Date(Date.now() + seconds * 1000).toISOString();
}

function redirectWithStatus(requestUrl: URL, status: string) {
  return NextResponse.redirect(
    new URL(
      `/?bank_connection_status=${encodeURIComponent(status)}`,
      requestUrl.origin
    ),
    { status: 303 }
  );
}

function getPublicErrorStatus(error: unknown): string {
  if (error instanceof EnableBankingRequestError) {
    return getEnableBankingErrorStatus(error);
  }

  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "server-config-error";
  }

  return "connection-start-error";
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
