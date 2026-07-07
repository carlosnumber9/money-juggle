export type EnableBankingAspsp = {
  name: string;
  country: string;
  logo: string;
  psu_types: string[];
  maximum_consent_validity: number;
  beta: boolean;
  bic?: string;
  auth_methods: Array<{
    name: string;
    psu_type: string;
    approach: string;
    hidden_method: boolean;
  }>;
  group?: {
    name: string;
    logo: string;
  };
};
