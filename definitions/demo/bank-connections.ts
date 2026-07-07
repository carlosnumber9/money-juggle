import type { BankConnectionSummary } from "../data-source";

export const DEMO_BANK_CONNECTIONS: BankConnectionSummary[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    status: "linked",
    consent_expires_at: "2026-12-31T23:59:59.000Z",
    created_at: "2026-07-05T08:00:00.000Z",
    updated_at: "2026-07-05T08:00:00.000Z",
    institution: {
      name: "CaixaBank",
      country: "ES",
      logo_url: "/assets/institutions/caixabank.svg"
    },
    accounts: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        name: "Cuenta corriente",
        currency: "EUR",
        iban_last4: "1842",
        account_type: "current",
        status: "active",
        latest_balance: {
          balance_type: "CLBD",
          amount: "2840.25",
          currency: "EUR",
          reference_date: "2026-07-05",
          fetched_at: "2026-07-05T08:00:00.000Z"
        }
      },
      {
        id: "20000000-0000-4000-8000-000000000002",
        name: "Ahorro",
        currency: "EUR",
        iban_last4: "9021",
        account_type: "savings",
        status: "active",
        latest_balance: {
          balance_type: "CLBD",
          amount: "6200.00",
          currency: "EUR",
          reference_date: "2026-07-05",
          fetched_at: "2026-07-05T08:00:00.000Z"
        }
      }
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    status: "linked",
    consent_expires_at: "2026-12-31T23:59:59.000Z",
    created_at: "2026-07-05T08:00:00.000Z",
    updated_at: "2026-07-05T08:00:00.000Z",
    institution: {
      name: "ING",
      country: "ES",
      logo_url: "/assets/institutions/ing.svg"
    },
    accounts: [
      {
        id: "20000000-0000-4000-8000-000000000003",
        name: "Cuenta nomina",
        currency: "EUR",
        iban_last4: "7710",
        account_type: "current",
        status: "active",
        latest_balance: {
          balance_type: "CLBD",
          amount: "1340.90",
          currency: "EUR",
          reference_date: "2026-07-05",
          fetched_at: "2026-07-05T08:00:00.000Z"
        }
      }
    ]
  }
];
