import type { Metadata } from "next"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { loadProfileFormData } from "@/lib/queries/profile-form"
import { CollaborationForm, FounderForm, PersonalForm } from "@/components/profile/profile-forms"
import { Panel, SectionTitle } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Profile settings" }

export default async function ProfileSettingsPage() {
  const me = await requireProfile()
  const supabase = await createClient()
  const d = await loadProfileFormData(supabase, me)
  return (
    <div className="space-y-6">
      <Panel id="personal" className="scroll-mt-20 p-5 sm:p-8">
        <SectionTitle>Personal information</SectionTitle>
        <PersonalForm initial={d.personal} />
      </Panel>
      <Panel id="skills" className="scroll-mt-20 p-5 sm:p-8">
        <SectionTitle>Skills, experience & interests</SectionTitle>
        <FounderForm initial={d.founder} categories={d.categories} skillSuggestions={d.skillSuggestions} />
      </Panel>
      <Panel id="collaboration" className="scroll-mt-20 p-5 sm:p-8">
        <SectionTitle>Collaboration preferences</SectionTitle>
        <CollaborationForm initial={d.collaboration} />
      </Panel>
      <p id="interests" className="text-xs text-muted-foreground">Your recommendations refresh automatically after you update your profile.</p>
    </div>
  )
}
