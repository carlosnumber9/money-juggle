import "server-only";

import { createSign } from "node:crypto";

type EnableBankingJwtInput = {
  applicationId: string;
  privateKey: string;
};

const ENABLE_BANKING_ISSUER = "enablebanking.com";
const ENABLE_BANKING_AUDIENCE = "api.enablebanking.com";
const TOKEN_TTL_SECONDS = 60 * 60;

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
    exp: issuedAt + TOKEN_TTL_SECONDS
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
