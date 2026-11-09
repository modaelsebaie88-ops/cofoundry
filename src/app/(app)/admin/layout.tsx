import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { AdminNav } from "./admin-nav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  const supabase = await createClient()
  const [{ count: reports }, { count: verifications }] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])
  return (
    <div>
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>
      </div>
      <AdminNav reports={reports ?? 0} verifications={verifications ?? 0} />
      <div className="mt-6">{children}</div>
    </div>
  )
}
