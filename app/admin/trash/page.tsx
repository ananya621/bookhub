import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import TrashList, { type TrashRow } from "./TrashList";

/*
 * Rewritten from the mock `trash` fixture into real pending_deletions
 * rows. Accounts only, on purpose — the export's trash held reviews and
 * requests too, but neither of those has a soft-delete here: a review is
 * moderated (allowed/deleted status, see app/actions/reviews.ts), not
 * put in a recovery bin, and a request is declined outright. Accounts
 * are the one thing with an actual 14-day undo window, so Trash shows
 * only what that window applies to rather than inventing entries for a
 * shape the other two don't have.
 *
 * pending_deletions and profiles both reference auth.users
 * independently (no direct FK between the two), so PostgREST can't
 * embed them — fetched separately and merged here, same as
 * /admin/users.
 */
export default async function AdminTrashPage() {
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("pending_deletions")
    .select("user_id, deleted_by, deleted_at, purge_at")
    .order("deleted_at", { ascending: false });

  const ids = (pending ?? []).map((p) => p.user_id as string);
  const { data: profiles } =
    ids.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] as { id: string; display_name: string | null }[] };

  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string | null]));

  const rows: TrashRow[] = (pending ?? []).map((p) => ({
    userId: p.user_id as string,
    displayName: nameById.get(p.user_id as string) ?? null,
    deletedBy: p.deleted_by as "self" | "admin",
    deletedAt: p.deleted_at as string,
    purgeAt: p.purge_at as string,
  }));

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 38, margin: "0 0 6px" }}>Trash</h1>
        <p style={{ fontSize: 14, marginBottom: 22 }}>
          Accounts deleted or banned, kept for 14 days. Nothing here is visible to readers, and
          anything can be put back until it&apos;s gone for good.
        </p>
        {rows.length === 0 ? (
          <div style={{ border: "3px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20 }}>
              Trash is empty
            </div>
            <p className="mono" style={{ color: "var(--color-neutral-700)", margin: "6px 0 0" }}>
              NOTHING DELETED IN THE LAST 14 DAYS
            </p>
          </div>
        ) : (
          <TrashList rows={rows} />
        )}
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.7 }}>
          AFTER 14 DAYS ACCOUNTS ARE REMOVED AUTOMATICALLY, BY A SCHEDULED JOB IN THE DATABASE. THAT
          WINDOW IS WHY DELETES ARE SOFT (A BAN + A RECORD HERE) RATHER THAN DESTRUCTIVE.
        </div>
      </div>
    </>
  );
}
