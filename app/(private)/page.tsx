import { redirect } from "next/navigation";

import { BalanceAutoSync } from "@/app/(private)/BalanceAutoSync";
import { BankConnectionsPanel } from "@/app/(private)/BankConnectionsPanel";
import { EnableBankingStatus } from "@/app/(private)/EnableBankingStatus";
import { MonthlyCashflowCards } from "@/app/(private)/MonthlyCashflowCards";
import { MonthlyEvolutionPanel } from "@/app/(private)/MonthlyEvolutionPanel";
import { MonthlyTransactionsPanel } from "@/app/(private)/MonthlyTransactionsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPrivateHomeView } from "@/lib/views/privateHomeView";

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
            <TabsTrigger value="evolution">Evolución</TabsTrigger>
          </TabsList>
        </div>
        <BalanceAutoSync
          enabled={
            view.providerStatus.status === "success" &&
            !view.providerStatus.isDemo
          }
        />
        <TabsContent value="dashboard" keepMounted className="mt-0">
          <MonthlyCashflowCards
            summary={view.monthlyCashflow}
            error={view.monthlyTransactions.error}
          />
          <BankConnectionsPanel cards={view.bankCards} />
        </TabsContent>
        <TabsContent value="transactions" keepMounted>
          <MonthlyTransactionsPanel
            enabled={
              view.providerStatus.status === "success" &&
              !view.providerStatus.isDemo
            }
            transactions={view.monthlyTransactions.rows}
            categoryGroups={view.monthlyTransactions.categoryGroups}
            range={view.monthlyTransactions.range}
            error={view.monthlyTransactions.error}
          />
        </TabsContent>
        <TabsContent value="evolution" keepMounted>
          <MonthlyEvolutionPanel
            evolution={view.monthlyEvolution.summary}
            error={view.monthlyEvolution.error}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
