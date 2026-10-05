import "server-only";

import type {
  MonthlyTransactionRange,
  TransactionReconciliationAdjustment
} from "@/definitions";
import { sumDecimals } from "@/lib/domain/decimal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { readReportPages, REPORT_PAGE_SIZE } from "./pagination";

export async function readReportAdjustments(
  userId: string,
  range: MonthlyTransactionRange
) {
  const supabase = await createSupabaseServerClient();
  const groups = await readReportPages((offset) =>
    supabase
      .from("transaction_reconciliations")
      .select(
        "id,currency,adjustment_reporting_date,transaction_categories(id,name,slug,transaction_category_groups(id,name))"
      )
      .eq("user_id", userId)
      .eq("difference_treatment", "reportable")
      .gte("adjustment_reporting_date", range.from)
      .lt("adjustment_reporting_date", range.to)
      .order("id")
      .range(offset, offset + REPORT_PAGE_SIZE - 1)
  );
  const adjustments: TransactionReconciliationAdjustment[] = [];
  let unavailableAdjustmentCount = 0;

  // Small ID batches bound URL length; every batch still reads all member pages.
  for (let start = 0; start < groups.length; start += 50) {
    const batch = groups.slice(start, start + 50);
    const items = await readReportPages((offset) =>
      supabase
        .from("transaction_reconciliation_items")
        .select(
          "transaction_id,reconciliation_id,transactions(amount,booking_status)"
        )
        .eq("user_id", userId)
        .in(
          "reconciliation_id",
          batch.map((group) => group.id)
        )
        .order("reconciliation_id")
        .order("transaction_id")
        .range(offset, offset + REPORT_PAGE_SIZE - 1)
    );
    for (const group of batch) {
      const members = items
        .filter((item) => item.reconciliation_id === group.id)
        .map((item) =>
          Array.isArray(item.transactions)
            ? item.transactions[0]
            : item.transactions
        );
      const category = Array.isArray(group.transaction_categories)
        ? group.transaction_categories[0]
        : group.transaction_categories;
      const categoryGroup = Array.isArray(category?.transaction_category_groups)
        ? category.transaction_category_groups[0]
        : category?.transaction_category_groups;
      if (
        members.length < 2 ||
        members.some(
          (member) => !member || member.booking_status !== "booked"
        ) ||
        !category ||
        !categoryGroup ||
        !group.adjustment_reporting_date
      ) {
        unavailableAdjustmentCount += 1;
        continue;
      }
      const amount = sumDecimals(
        members.map((member) => String(member!.amount))
      );
      if (amount === "0") continue;
      adjustments.push({
        reconciliationId: group.id,
        reportingDate: group.adjustment_reporting_date,
        amount,
        currency: group.currency,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          group: { id: categoryGroup.id, name: categoryGroup.name }
        },
        labels: []
      });
    }
  }
  return { adjustments, unavailableAdjustmentCount };
}
