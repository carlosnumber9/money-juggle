"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";
import { confirmBankAccountReview } from "@/lib/db/enableBankingConnections/accountReview";
import { BankAccountMatchError } from "@/lib/db/enableBankingConnections/accountMatching";

export async function confirmAccountReview(formData: FormData) {
  const user = await getCurrentSupabaseUser();
  if (!user || !isEmailAllowed(user.email)) redirect("/login");
  const connectionId = String(formData.get("connectionId") ?? "");
  const reviewId = String(formData.get("reviewId") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(connectionId) ||
    !/^[0-9a-f-]{36}$/i.test(reviewId)
  )
    redirect("/");
  const values = formData.getAll("accountMatch");
  const path = `/bank-connections/${connectionId}/review`;
  if (
    formData.get("confirmed") !== "on" ||
    values.length === 0 ||
    values.some(
      (value) =>
        typeof value !== "string" ||
        (value !== "new" && !/^[0-9a-f-]{36}$/i.test(value))
    )
  )
    redirect(`${path}?status=invalid`);
  try {
    await confirmBankAccountReview({
      userId: user.id,
      bankConnectionId: connectionId,
      reviewId,
      requestHeaders: await headers(),
      matches: values.map((value) => (value === "new" ? null : String(value)))
    });
  } catch (error) {
    console.warn("Bank account review completion failed", {
      phase: "account-review",
      reason:
        error instanceof BankAccountMatchError
          ? error.reason
          : "review-unavailable"
    });
    redirect(`${path}?status=failed`);
  }
  revalidatePath("/");
  redirect("/bank-connection-result?status=linked");
}
