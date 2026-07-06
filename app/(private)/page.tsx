import { redirect } from "next/navigation";

import { BalanceAutoSync } from "@/app/(private)/balance-auto-sync";
import { BankConnectionsPanel } from "@/app/(private)/bank-connections-panel";
import { EnableBankingStatus } from "@/app/(private)/enable-banking-status";
import { getPrivateHomeView } from "@/lib/views/private-home-view";

export default async function Home() {
  const view = await getPrivateHomeView();

  if (view.kind === "unauthenticated") {
    redirect("/login");
  }

  if (view.kind === "forbidden") {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-14">
      <div className="flex items-center gap-2">
        <EnableBankingStatus status={view.providerStatus} />
        <h1 className="min-w-0 text-3xl leading-tight">Tus cuentas</h1>
      </div>
      <BalanceAutoSync
        enabled={
          view.providerStatus.status === "success" &&
          !view.providerStatus.isDemo
        }
      />
      <BankConnectionsPanel cards={view.bankCards} />
    </main>
  );
}
