import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { RESOURCE_CATEGORIES } from "@/lib/constants"
import { Tag } from "@/components/shared/badges"
import { Panel } from "@/components/shared/page-header"
import { ResourceEditor } from "./resource-editor"

export const metadata: Metadata = { title: "Resources · Admin" }

export default async function AdminResourcesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false })
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ResourceEditor resource={null} />
      </div>
      <Panel className="divide-y">
        {(data ?? []).map((r) => (
          <div key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <Link href={`/resources/${r.slug}`} className="min-w-0 flex-1">
              <p className="text-sm font-medium">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">{r.summary}</p>
            </Link>
            <div className="flex items-center gap-2">
              <Tag>{RESOURCE_CATEGORIES[r.category]}</Tag>
              {r.is_featured && <Tag tone="primary">Featured</Tag>}
              {!r.is_published && <Tag>Draft</Tag>}
              <ResourceEditor
                resource={{
                  id: r.id,
                  title: r.title,
                  summary: r.summary,
                  body: r.body ?? "",
                  category: r.category,
                  kind: r.kind as "guide",
                  external_url: r.external_url ?? "",
                  read_minutes: r.read_minutes,
                  is_featured: r.is_featured,
                  is_published: r.is_published,
                }}
              />
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}
