"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/*
 * Reports — see supabase/migrations/20260902180100_reports.sql. One
 * table backs both the ordinary moderation queue and the Safeguarding
 * queue (type = 'safety_concern'), polymorphic over target_type/
 * target_id (a review or a reader).
 *
 * The source's report dialog (Prototype with Admin.dc.html ~2640) lets
 * a report go through on free text alone, with no reason picked — but
 * the table's `type` column is a fixed, NOT NULL set of five reasons
 * (matching the five radios), so here a reason is required; the
 * optional textarea still goes into `note` either way. Told to the
 * user alongside this build rather than silently changed.
 *
 * The source also has a `reportOpen`/`myReports` per-session repeat
 * limit gated on `this.REPORT_LIMIT`, a constant the source never
 * actually defines — so in the export itself the limit never
 * triggers. Not ported, same as the dead `reviewBlocked` branch on the
 * write-review page. What *is* real here: a reader can't file the same
 * report twice for the same target (checked below, and reflected back
 * as the "REPORTED — WE'LL TAKE A LOOK" state persisting across visits
 * instead of resetting every session).
 */

export type ActionResult = { error: string } | { ok: string } | undefined;

const REPORT_TYPES = ["rude", "spam", "off_topic", "bad_language", "safety_concern"] as const;
const TARGET_TYPES = ["review", "user"] as const;

export async function submitReport(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const type = String(formData.get("type") ?? "");
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!REPORT_TYPES.includes(type as (typeof REPORT_TYPES)[number])) {
    return { error: "PICK A REASON" };
  }
  if (!TARGET_TYPES.includes(targetType as (typeof TARGET_TYPES)[number]) || !targetId) {
    return { error: "SOMETHING WENT WRONG" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SIGN UP TO REPORT SOMETHING" };

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  if (existing) return { ok: "already reported" };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    type,
    target_type: targetType,
    target_id: targetId,
    note,
  });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/reviews");
  revalidatePath("/admin/safeguarding");
  return { ok: "reported" };
}

/*
 * Admin: "Mark as actioned" / "Reopen" (Safeguarding), same shape as
 * Allow/Undo elsewhere — a status flip, not a delete.
 */
export async function adminSetReportStatus(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!reportId || !["open", "actioned"].includes(status)) {
    return { error: "SOMETHING WENT WRONG" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/safeguarding");
  revalidatePath("/admin/reviews");
  return { ok: "updated" };
}
