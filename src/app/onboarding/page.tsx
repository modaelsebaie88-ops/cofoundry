import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { loadProfileFormData } from "@/lib/queries/profile-form"
import { createClient } from "@/lib/supabase/server"
import { Logo } from "@/components/shell/logo"
import { OnboardingWizard } from "./wizard"

export const metadata: Metadata = { title: "Set up your profile" }

export default async function OnboardingPage() {
  const profile = await requireProfile({ allowIncomplete: true })
  if (profile.onboarding_completed) redirect("/dashboard")
  const supabase = await createClient()
  const data = await loadProfileFormData(supabase, profile)
  return (
    <div className="min-h-screen bg-soft-gradient">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <OnboardingWizard
          categories={data.categories}
          skillSuggestions={data.skillSuggestions}
          personal={data.personal}
          founder={data.founder}
          collaboration={data.collaboration}
          startup={data.startup}
          emptyStartup={data.emptyStartup}
        />
      </main>
    </div>
  )
}
