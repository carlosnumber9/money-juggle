import type { EnableBankingAccountResource } from "./account";
import type { EnableBankingAccess } from "./access";

export type EnableBankingStartAuthorizationInput = {
  access: EnableBankingAccess;
  aspsp: {
    name: string;
    country: string;
  };
  state: string;
  redirect_url: string;
  psu_type: "personal" | "business";
  language?: string;
  psu_id: string;
};

export type EnableBankingStartAuthorizationResponse = {
  url: string;
  authorization_id: string;
  psu_id_hash: string;
  access?: EnableBankingAccess;
};

export type EnableBankingAuthorizeSessionResponse = {
  session_id: string;
  accounts: EnableBankingAccountResource[];
  aspsp: {
    name: string;
    country: string;
  };
  psu_type: string;
  access: EnableBankingAccess;
};
