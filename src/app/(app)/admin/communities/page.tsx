import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Panel } from "@/components/shared/page-header"
import { CategoryIcon } from "@/components/shared/category-icon"
import { CommunityEditor, ModeratorManager } from "./community-editor"

export const metadata: Metadata = { title: "Communities · Admin" }

export default async function AdminCommunitiesPage() {
  const supabase = await createClient()
  const { data: communities } = await supabase
    .from("communities")
    .select("id, slug, name, description, rules, icon, member_count, post_count, category_id, community_members(role, profiles(id, full_name))")
    .order("name")
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CommunityEditor community={null} />
      </div>
      <Panel className="divide-y">
        {(communities ?? []).map((c, i) => {
          const mods = c.community_members.filter((m) => m.role === "moderator" && m.profiles).map((m) => m.profiles!)
          return (
            <div key={c.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
              <Link href={`/communities/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CategoryIcon name={c.icon} size="sm" seed={i} />
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.member_count} members · {c.post_count} posts · moderators: {mods.map((m) => m.full_name).join(", ") || "none"}
                  </span>
                </span>
              </Link>
              <div className="flex gap-2">
                <ModeratorManager communityId={c.id} moderators={mods} />
                <CommunityEditor community={{ id: c.id, name: c.name, description: c.description ?? "", rules: c.rules ?? "", icon: c.icon }} />
              </div>
            </div>
          )
        })}
      </Panel>
    </div>
  )
}
