"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Rocket } from "lucide-react"
import {
  CollaborationForm,
  FounderForm,
  PersonalForm,
  StartupForm,
  type CollaborationValues,
  type FounderValues,
  type PersonalValues,
  type StartupValues,
} from "@/components/profile/profile-forms"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STEPS = [
  { key: "personal", title: "About you", description: "How other founders will see you." },
  { key: "startup", title: "Your startup", description: "What you're building — skip if you're still exploring." },
  { key: "founder", title: "Skills & experience", description: "What you bring and what you care about." },
  { key: "collaboration", title: "Collaboration", description: "What you need and what you can offer. This powers your matches." },
] as const

export function OnboardingWizard(props: {
  categories: { id: number; name: string }[]
  skillSuggestions: string[]
  personal: PersonalValues
  founder: FounderValues
  collaboration: CollaborationValues
  startup: StartupValues | null
  emptyStartup: StartupValues
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [noStartup, setNoStartup] = useState(false)
  const next = () => {
    router.refresh() // keep server-provided initial values in sync when navigating back
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const back = (
    <Button type="button" variant="ghost" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))}>
      Back
    </Button>
  )

  return (
    <div>
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Onboarding progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="min-w-0">
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-primary/10")} />
            <div className={cn("mt-2 hidden truncate text-xs font-medium sm:block", i === step ? "text-primary" : "text-muted-foreground")}>
              {i < step ? <Check className="mr-1 inline size-3" /> : null}
              {s.title}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-5 shadow-soft sm:p-8">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{STEPS[step].title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{STEPS[step].description}</p>

        {step === 0 && <PersonalForm initial={props.personal} submitLabel="Continue" onSuccess={next} />}

        {step === 1 &&
          (noStartup ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-dashed bg-muted/40 p-6 text-center">
                <Rocket className="mx-auto mb-2 size-6 text-primary" />
                <p className="font-medium">No problem — many founders join while exploring ideas.</p>
                <p className="mt-1 text-sm text-muted-foreground">You can create your startup profile any time from “My Startup”.</p>
                <Button variant="link" onClick={() => setNoStartup(false)}>
                  Actually, I have a startup
                </Button>
              </div>
              <div className="flex justify-between border-t pt-5">
                {back}
                <Button size="lg" onClick={next}>
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" onClick={() => setNoStartup(true)} className="mb-5 text-sm text-primary hover:underline">
                I don&apos;t have a startup yet — skip this step
              </button>
              <StartupForm initial={props.startup ?? props.emptyStartup} categories={props.categories} submitLabel="Continue" onSuccess={next} secondary={back} />
            </>
          ))}

        {step === 2 && (
          <FounderForm
            initial={props.founder}
            categories={props.categories}
            skillSuggestions={props.skillSuggestions}
            submitLabel="Continue"
            onSuccess={next}
            secondary={back}
          />
        )}

        {step === 3 && (
          <CollaborationForm
            initial={props.collaboration}
            completeOnboarding
            submitLabel="Finish & find my matches"
            secondary={back}
            onSuccess={() => {
              router.push("/dashboard?welcome=1")
              router.refresh()
            }}
          />
        )}
      </div>
    </div>
  )
}
