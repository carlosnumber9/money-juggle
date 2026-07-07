export type EnableBankingApplication = {
  name: string;
  description?: string;
  kid: string;
  environment: string;
  redirect_urls: string[];
  active: boolean;
  countries: string[];
  services: string[];
};
