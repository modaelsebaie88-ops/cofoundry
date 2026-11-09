import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, ExternalLink } from "lucide-react"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { RESOURCE_CATEGORIES } from "@/lib/constants"
import { Tag } from "@/components/shared/badges"
import { Markdown } from "@/components/shared/markdown"
import { Panel } from "@/components/shared/page-header"
import { SaveButton } from "@/components/shared/save-button"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("resources").select("title, summary").eq("slug", slug).maybeSingle()
  return { title: data?.title ?? "Resource", description: data?.summary }
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const me = await requireProfile()
  const supabase = await createClient()
  const { data: r } = await supabase.from("resources").select("*").eq("slug", slug).maybeSingle()
  if (!r) notFound()
  const [{ data: saved }, { data: related }] = await Promise.all([
    supabase.from("saved_items").select("item_id").eq("profile_id", me.id).eq("item_type", "resource").eq("item_id", r.id).maybeSingle(),
    supabase.from("resources").select("slug, title, read_minutes").eq("category", r.category).eq("is_published", true).neq("id", r.id).limit(3),
  ])
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/resources" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Resource library
      </Link>
      <Panel className="p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/resources?category=${r.category}`}>
            <Tag tone="primary">{RESOURCE_CATEGORIES[r.category]}</Tag>
          </Link>
          {r.read_minutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {r.read_minutes} min read
            </span>
          )}
          <div className="ml-auto">
            <SaveButton itemType="resource" itemId={r.id} saved={Boolean(saved)} withLabel />
          </div>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{r.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{r.summary}</p>
        <hr className="my-6" />
        {r.body ? <Markdown>{r.body}</Markdown> : null}
        {r.external_url && (
          <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Open resource <ExternalLink className="size-3.5" />
          </a>
        )}
      </Panel>
      {related && related.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold">More in {RESOURCE_CATEGORIES[r.category]}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((x) => (
              <Link key={x.slug} href={`/resources/${x.slug}`} className="card-hover rounded-xl border bg-card p-4 text-sm font-medium">
                {x.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
