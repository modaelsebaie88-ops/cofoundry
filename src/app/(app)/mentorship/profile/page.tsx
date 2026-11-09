import type { Metadata } from "next"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader, Panel } from "@/components/shared/page-header"
import { MentorProfileForm } from "./mentor-form"

export const metadata: Metadata = { title: "Mentor profile" }

export default async function MentorProfilePage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: m } = await supabase.from("mentor_profiles").select("*").eq("profile_id", me.id).maybeSingle()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={m ? "Edit your mentor profile" : "Become a mentor"}
        description="Share what you've learned. Founders request sessions; you confirm times that work for you and can pause requests any time."
      />
      <Panel className="p-5 sm:p-8">
        <MentorProfileForm
          isNew={!m}
          initial={{
            expertise: m?.expertise ?? me.help_topics ?? [],
            focus_stages: m?.focus_stages ?? [],
            about: m?.about ?? "",
            availability_note: m?.availability_note ?? "",
            session_minutes: m?.session_minutes ?? 45,
            sessions_per_month: m?.sessions_per_month ?? 4,
            is_accepting: m?.is_accepting ?? true,
          }}
        />
      </Panel>
    </div>
  )
}
