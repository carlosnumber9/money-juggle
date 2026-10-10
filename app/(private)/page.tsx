import { Suspense } from "react";
import { InitialLoadCheckpoint } from "./InitialLoadProvider";
import { createInitialLoadProgress } from "@/lib/views/privateHomeView/initialLoadProgress";
import type {
  InitialLoadReporter,
  PrivateHomeView,
  ProgressStatus
} from "@/definitions";

import { redirect } from "next/navigation";

import { BankConnectionsPanel } from "@/app/(private)/BankConnectionsPanel";
import { DashboardSyncControls } from "@/app/(private)/DashboardSyncControls";
import { EnableBankingStatus } from "@/app/(private)/EnableBankingStatus";
import { MonthlyCashflowCards } from "@/app/(private)/MonthlyCashflowCards";
import { MonthlyEvolutionPanel } from "@/app/(private)/MonthlyEvolutionPanel";
import { TransactionsMonthPanel } from "./TransactionsMonthPanel";
import { HomeTabs } from "./HomeTabs";
import type { PrivateHomePageProps } from "@/definitions";
import { getPrivateHomeView } from "@/lib/views/privateHomeView";

export default function Home({ searchParams }: PrivateHomePageProps) {
  const progress = createInitialLoadProgress();
  const view = loadHome(searchParams, progress.report).catch(
    (error: unknown) => {
      progress.fail();
      throw error;
    }
  );
  return (
    <>
      {(["session", "data", "prepared"] as const).map((phase) => (
        <Suspense key={phase} fallback={null}>
          <StreamedCheckpoint
            phase={phase}
            milestone={progress.milestones[phase]}
          />
        </Suspense>
      ))}
      <Suspense fallback={null}>
        <PreparedHome viewPromise={view} />
      </Suspense>
    </>
  );
}

async function StreamedCheckpoint({
  phase,
  milestone
}: {
  phase: "session" | "data" | "prepared";
  milestone: Promise<ProgressStatus>;
}) {
  return <InitialLoadCheckpoint phase={phase} status={await milestone} />;
}

async function loadHome(
  searchParams: PrivateHomePageProps["searchParams"],
  report: InitialLoadReporter
) {
  const { month, tab } = await searchParams;
  const view = await getPrivateHomeView(
    typeof month === "string" ? month : undefined,
    getSelectedTab(tab),
    report
  );
  if (view.kind !== "ready") {
    report("session", "error");
    report("data", "skipped");
    report("prepared", "skipped");
  }
  return view;
}

async function PreparedHome({
  viewPromise
}: {
  viewPromise: Promise<PrivateHomeView>;
}) {
  const view = await viewPromise;
  if (view.kind === "unauthenticated") {
    redirect("/login");
  }

  if (view.kind === "forbidden") {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-14">
      <InitialLoadCheckpoint phase="mounted" />
      <HomeTabs
        selectedTab={view.tab}
        heading={
          <div className="flex min-w-0 items-center gap-2">
            <EnableBankingStatus status={view.providerStatus} />
            <h1 className="min-w-0 text-3xl leading-tight">Tus cuentas</h1>
          </div>
        }
      >
        {view.tab === "dashboard" && (
          <>
            <MonthlyCashflowCards
              summary={view.monthlyCashflow}
              selectedMonth={view.selectedMonth}
              error={view.monthlyCashflowError}
            />
            <BankConnectionsPanel cards={view.bankCards} />
            <DashboardSyncControls
              enabled={view.dashboardSyncEnabled}
              backfill={view.transactionBackfill}
              exportPeriod={view.monthlyExportPeriod}
            />
          </>
        )}
        {view.tab === "transactions" && (
          <TransactionsMonthPanel initialData={view.monthlyTransactions} />
        )}
        {view.tab === "evolution" && (
          <MonthlyEvolutionPanel
            evolution={view.monthlyEvolution.summary}
            categoryExpenses={view.monthlyEvolution.categoryExpenses}
            labelExpenses={view.monthlyEvolution.labelExpenses}
            selectedMonth={view.selectedMonth}
            error={view.monthlyEvolution.error}
            categoryExpensesError={view.monthlyEvolution.categoryExpensesError}
            labelExpensesError={view.monthlyEvolution.labelExpensesError}
          />
        )}
      </HomeTabs>
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
