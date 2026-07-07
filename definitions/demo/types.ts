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
