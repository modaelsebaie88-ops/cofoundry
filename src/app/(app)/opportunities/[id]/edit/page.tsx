import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { OpportunityForm } from "@/components/opportunities/opportunity-form"
import { PageHeader, Panel } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Edit opportunity" }

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: o } = await supabase.from("opportunities").select("*").eq("id", id).eq("author_id", me.id).maybeSingle()
  if (!o) notFound()
  const [{ data: categories }, { data: skills }, { data: startup }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("skills").select("name").order("name").limit(1000),
    supabase.from("startups").select("name").eq("owner_id", me.id).maybeSingle(),
  ])
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit opportunity" />
      <Panel className="p-5 sm:p-8">
        <OpportunityForm
          id={o.id}
          categories={categories ?? []}
          skillSuggestions={(skills ?? []).map((s) => s.name)}
          startupName={startup?.name ?? null}
          initial={{
            type: o.type,
            title: o.title,
            description: o.description,
            required_skills: o.required_skills,
            category_id: o.category_id,
            stage: o.stage,
            collaboration_type: o.collaboration_type,
            requirements: o.requirements,
            location: o.location,
            is_remote: o.is_remote,
            attach_startup: Boolean(o.startup_id),
          }}
        />
      </Panel>
    </div>
  )
}
