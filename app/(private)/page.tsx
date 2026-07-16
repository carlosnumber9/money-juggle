import { redirect } from "next/navigation";

import { BankConnectionsPanel } from "@/app/(private)/BankConnectionsPanel";
import { DashboardSyncControls } from "@/app/(private)/DashboardSyncControls";
import { EnableBankingStatus } from "@/app/(private)/EnableBankingStatus";
import { MonthlyCashflowCards } from "@/app/(private)/MonthlyCashflowCards";
import { MonthlyEvolutionPanel } from "@/app/(private)/MonthlyEvolutionPanel";
import { MonthlyTransactionsPanel } from "@/app/(private)/MonthlyTransactionsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PrivateHomePageProps } from "@/definitions";
import { getPrivateHomeView } from "@/lib/views/privateHomeView";

export default async function Home({ searchParams }: PrivateHomePageProps) {
  const { month, tab } = await searchParams;
  const requestedMonth = typeof month === "string" ? month : undefined;
  const selectedTab = getSelectedTab(tab);
  const view = await getPrivateHomeView(requestedMonth);

  if (view.kind === "unauthenticated") {
    redirect("/login");
  }

  if (view.kind === "forbidden") {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-14">
      <Tabs key={selectedTab} defaultValue={selectedTab}>
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
        <TabsContent value="dashboard" keepMounted className="mt-0">
          <MonthlyCashflowCards
            summary={view.monthlyCashflow}
            selectedMonth={view.selectedMonth}
            error={view.monthlyTransactions.error}
          />
          <BankConnectionsPanel cards={view.bankCards} />
          <DashboardSyncControls
            enabled={view.dashboardSyncEnabled}
            backfill={view.transactionBackfill}
          />
        </TabsContent>
        <TabsContent value="transactions" keepMounted>
          <MonthlyTransactionsPanel
            key={view.selectedMonth.value}
            transactions={view.monthlyTransactions.rows}
            categoryGroups={view.monthlyTransactions.categoryGroups}
            selectedMonth={view.selectedMonth}
            error={view.monthlyTransactions.error}
          />
        </TabsContent>
        <TabsContent value="evolution" keepMounted>
          <MonthlyEvolutionPanel
            evolution={view.monthlyEvolution.summary}
            categoryExpenses={view.monthlyEvolution.categoryExpenses}
            selectedMonth={view.selectedMonth}
            error={view.monthlyEvolution.error}
            categoryExpensesError={view.monthlyEvolution.categoryExpensesError}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function getSelectedTab(
  value: string | string[] | undefined
): "dashboard" | "transactions" | "evolution" {
  return value === "transactions" || value === "evolution"
    ? value
    : "dashboard";
}
