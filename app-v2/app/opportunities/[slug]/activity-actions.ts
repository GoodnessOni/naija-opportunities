"use server";

import { revalidatePath } from "next/cache";
import { planActivityWrite } from "../../../lib/activity";
import { createUserClient } from "../../../lib/supabase/server";

export type ActivityState = { error?: string };

export async function updateActivity(_: ActivityState, form: FormData): Promise<ActivityState> {
  const supabase = await createUserClient();
  if (!supabase) return { error: "Saving is not available right now." };
  const { data: { user } } = await supabase.auth.getUser();
  const plan = planActivityWrite({
    action: String(form.get("action") ?? ""),
    listingId: String(form.get("listing_id") ?? ""),
    userId: user?.id ?? "",
    confirmed: form.get("confirm_applied") === "yes",
    now: new Date(),
  });
  if (plan.kind === "error") return { error: plan.message };
  const table = supabase.schema("shared").from("opportunity_activity");
  const { error } = plan.kind === "delete"
    ? await table.delete().eq("user_id", plan.user_id).eq("listing_id", plan.listing_id)
    : await table.upsert(plan.row, { onConflict: "user_id,listing_id", ignoreDuplicates: plan.keepExisting });
  if (error) return { error: "That did not save. Please try again." };
  revalidatePath("/opportunities/[slug]", "page");
  return {};
}
