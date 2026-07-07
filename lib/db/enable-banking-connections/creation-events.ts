import "server-only";

import type {
  EnableBankingAccess,
  EnableBankingAspsp,
  EnableBankingStartAuthorizationResponse
} from "@/definitions";

import { insertConsentEvent } from "./consent-events";

export type CreateLinkingConnectionInput = {
  userId: string;
  email: string;
  aspsp: EnableBankingAspsp;
  state: string;
  redirectUrl: string;
  requestedAccess: EnableBankingAccess;
  authorization: EnableBankingStartAuthorizationResponse;
};

export function getProviderMetadata(input: CreateLinkingConnectionInput) {
  return {
    aspsp: {
      name: input.aspsp.name,
      country: input.aspsp.country,
      maximum_consent_validity: input.aspsp.maximum_consent_validity
    },
    requested_access: input.requestedAccess,
    requested_redirect_url: input.redirectUrl
  };
}

export async function insertCreationEvents(
  input: CreateLinkingConnectionInput,
  bankConnectionId: string
) {
  await insertConsentEvent({
    userId: input.userId,
    bankConnectionId,
    eventType: "created",
    providerStatus: "linking",
    message: "Enable Banking authorization was created.",
    metadata: { authorization_id: input.authorization.authorization_id }
  });
  await insertConsentEvent({
    userId: input.userId,
    bankConnectionId,
    eventType: "redirected",
    providerStatus: "redirected",
    message: "User was redirected to Enable Banking authorization.",
    metadata: { authorization_id: input.authorization.authorization_id }
  });
}
