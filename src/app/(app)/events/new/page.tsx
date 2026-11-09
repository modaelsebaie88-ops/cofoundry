import type { Metadata } from "next"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { EventForm } from "@/components/events/event-form"
import { PageHeader, Panel } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Host an event" }

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ community?: string }> }) {
  const { community } = await searchParams
  const me = await requireProfile()
  const supabase = await createClient()
  const { data } = await supabase.from("community_members").select("communities(id, name)").eq("profile_id", me.id)
  const communities = (data ?? []).map((d) => d.communities).filter(Boolean) as { id: string; name: string }[]
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Host an event" description="Meetups, workshops, AMAs, hackathons — registrants get a reminder 24 hours before." />
      <Panel className="p-5 sm:p-8">
        <EventForm
          id={null}
          communities={communities}
          initial={{
            title: "",
            description: "",
            type: "",
            starts_at: "",
            ends_at: "",
            is_online: true,
            location: null,
            meeting_url: null,
            capacity: null,
            community_id: communities.some((c) => c.id === community) ? community! : null,
          }}
        />
      </Panel>
    </div>
  )
}
