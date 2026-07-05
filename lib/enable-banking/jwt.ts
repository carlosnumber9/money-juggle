import "server-only";

import { createSign } from "node:crypto";
import {
  ENABLE_BANKING_AUDIENCE,
  ENABLE_BANKING_ISSUER,
  ENABLE_BANKING_TOKEN_TTL_SECONDS,
  type EnableBankingJwtInput
} from "@/definitions";

export function createEnableBankingJwt({
  applicationId,
  privateKey
}: EnableBankingJwtInput): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    typ: "JWT",
    alg: "RS256",
    kid: applicationId
  };
  const payload = {
    iss: ENABLE_BANKING_ISSUER,
    aud: ENABLE_BANKING_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + ENABLE_BANKING_TOKEN_TTL_SECONDS
  };

  const unsignedToken = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .end()
    .sign(privateKey, "base64url");

  return `${unsignedToken}.${signature}`;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
