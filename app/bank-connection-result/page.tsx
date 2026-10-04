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
  searchParams: Promise<{ status?: string | string[]; connection?: string }>;
}) {
  const { status, connection } = await searchParams;
  const reviewUrl =
    status === "account-match-required" &&
    typeof connection === "string" &&
    /^[0-9a-f-]{36}$/i.test(connection)
      ? `/bank-connections/${connection}/review`
      : undefined;

  return (
    <BankConnectionResultContent
      result={getBankConnectionResult(status)}
      reviewUrl={reviewUrl}
    />
  );
}
