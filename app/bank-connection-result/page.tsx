import type { Metadata } from "next";

import { BankConnectionResultContent } from "./BankConnectionResultContent";
import { getBankConnectionResult } from "./result";

export const metadata: Metadata = {
  title: "Resultado de conexión | Money Juggle",
  robots: { index: false, follow: false }
};

export default async function BankConnectionResultPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { status } = await searchParams;

  return (
    <BankConnectionResultContent result={getBankConnectionResult(status)} />
  );
}
