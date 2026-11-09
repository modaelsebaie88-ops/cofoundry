import type { Metadata } from "next"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { OpportunityForm } from "@/components/opportunities/opportunity-form"
import { PageHeader, Panel } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Post an opportunity" }

export default async function NewOpportunityPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const [{ data: categories }, { data: skills }, { data: startup }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("skills").select("name").order("name").limit(1000),
    supabase.from("startups").select("name, category_id, stage").eq("owner_id", me.id).maybeSingle(),
  ])
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Post an opportunity" description="Describe who you're looking for — matching founders will see it in their dashboard." />
      <Panel className="p-5 sm:p-8">
        <OpportunityForm
          id={null}
          categories={categories ?? []}
          skillSuggestions={(skills ?? []).map((s) => s.name)}
          startupName={startup?.name ?? null}
          initial={{
            type: "",
            title: "",
            description: "",
            required_skills: [],
            category_id: startup?.category_id ?? null,
            stage: startup?.stage ?? null,
            collaboration_type: "",
            requirements: null,
            location: null,
            is_remote: true,
            attach_startup: true,
          }}
        />
      </Panel>
    </div>
  )
}
