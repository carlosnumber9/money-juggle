import { redirect } from "next/navigation";

import { BalanceAutoSync } from "@/app/(private)/balance-auto-sync";
import { BankConnectionsPanel } from "@/app/(private)/bank-connections-panel";
import { EnableBankingStatus } from "@/app/(private)/enable-banking-status";
import { MonthlyTransactionsPanel } from "@/app/(private)/monthly-transactions-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
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
      <Tabs defaultValue="dashboard">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <EnableBankingStatus status={view.providerStatus} />
            <h1 className="min-w-0 text-3xl leading-tight">Tus cuentas</h1>
          </div>
          <TabsList aria-label="Secciones de tus cuentas">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          </TabsList>
        </div>
        <BalanceAutoSync
          enabled={
            view.providerStatus.status === "success" &&
            !view.providerStatus.isDemo
          }
        />
        <TabsContent value="dashboard" keepMounted className="mt-0">
          <BankConnectionsPanel cards={view.bankCards} />
        </TabsContent>
        <TabsContent value="transactions" keepMounted>
          <MonthlyTransactionsPanel
            enabled={
              view.providerStatus.status === "success" &&
              !view.providerStatus.isDemo
            }
            transactions={view.monthlyTransactions.rows}
            range={view.monthlyTransactions.range}
            error={view.monthlyTransactions.error}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
