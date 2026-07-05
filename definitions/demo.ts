import type {
  AppUser,
  BankConnectionSummary,
  InstitutionAvailability,
  ProviderApplication
} from "./data-source";

export type DemoBalance = {
  id: string;
  accountId: string;
  balanceType: string;
  amount: string;
  currency: string;
  referenceDate: string;
  fetchedAt: string;
};

export type DemoTransaction = {
  id: string;
  accountId: string;
  bookingStatus: "booked" | "pending" | "information";
  bookingDate: string;
  amount: string;
  currency: string;
  description: string;
  merchantName: string | null;
  counterpartyName: string | null;
};

export const DEMO_USER: AppUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@money-juggle.local",
  isAllowed: true
};

export const DEMO_PROVIDER_APPLICATION: ProviderApplication = {
  name: "money-juggle demo",
  kid: "demo-local-key",
  environment: "demo",
  active: true,
  countries: ["ES"],
  services: ["AIS"]
};

export const DEMO_INSTITUTIONS: InstitutionAvailability[] = [
  {
    name: "CaixaBank",
    country: "ES",
    logo: "/assets/institutions/caixabank.svg",
    beta: false,
    maximumConsentValidity: 180 * 24 * 60 * 60
  },
  {
    name: "ING",
    country: "ES",
    logo: "/assets/institutions/ing.svg",
    beta: false,
    maximumConsentValidity: 180 * 24 * 60 * 60
  }
];

export const DEMO_BANK_CONNECTIONS: BankConnectionSummary[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    status: "linked",
    consent_expires_at: "2026-12-31T23:59:59.000Z",
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

export const DEMO_BALANCES: DemoBalance[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    accountId: "20000000-0000-4000-8000-000000000001",
    balanceType: "CLBD",
    amount: "2840.25",
    currency: "EUR",
    referenceDate: "2026-07-05",
    fetchedAt: "2026-07-05T08:00:00.000Z"
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    accountId: "20000000-0000-4000-8000-000000000002",
    balanceType: "CLBD",
    amount: "6200.00",
    currency: "EUR",
    referenceDate: "2026-07-05",
    fetchedAt: "2026-07-05T08:00:00.000Z"
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    accountId: "20000000-0000-4000-8000-000000000003",
    balanceType: "CLBD",
    amount: "1340.90",
    currency: "EUR",
    referenceDate: "2026-07-05",
    fetchedAt: "2026-07-05T08:00:00.000Z"
  }
];

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    accountId: "20000000-0000-4000-8000-000000000001",
    bookingStatus: "booked",
    bookingDate: "2026-07-04",
    amount: "-42.35",
    currency: "EUR",
    description: "Compra supermercado",
    merchantName: "Mercadona",
    counterpartyName: null
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    accountId: "20000000-0000-4000-8000-000000000001",
    bookingStatus: "booked",
    bookingDate: "2026-07-03",
    amount: "-12.50",
    currency: "EUR",
    description: "Cafe y desayuno",
    merchantName: "Panaderia local",
    counterpartyName: null
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    accountId: "20000000-0000-4000-8000-000000000003",
    bookingStatus: "booked",
    bookingDate: "2026-07-01",
    amount: "2450.00",
    currency: "EUR",
    description: "Nomina",
    merchantName: null,
    counterpartyName: "Empresa demo"
  }
];
