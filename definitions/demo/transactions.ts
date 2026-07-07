import type { DemoTransaction } from "./types";

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
