import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";

import { BankConnectionsPanel } from "@/app/(private)/bank-connections-panel";
import { EnableBankingStatus } from "@/app/(private)/enable-banking-status";
import { getPrivateHomeView } from "@/lib/views/private-home-view";

type HomeProps = {
  searchParams?: Promise<{
    bank_connection_status?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const view = await getPrivateHomeView(params?.bank_connection_status);

  if (view.kind === "unauthenticated") {
    redirect("/login");
  }

  if (view.kind === "forbidden") {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-14">
      <div className="flex items-center justify-between gap-4">
        <h1 className="min-w-0 text-3xl leading-tight">Tus cuentas</h1>

        <Card
          size="sm"
          className="shrink-0 p-1 py-0"
          aria-label="Estado de conexión con Enable Banking"
        >
          <CardContent className="p-0">
            <EnableBankingStatus status={view.providerStatus} />
          </CardContent>
        </Card>
      </div>
      <BankConnectionsPanel cards={view.bankCards} />
    </main>
  );
}
