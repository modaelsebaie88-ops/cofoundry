import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Panel } from "@/components/shared/page-header"
import { CategoryIcon } from "@/components/shared/category-icon"
import { CategoryForm, CategoryRowActions } from "./category-form"

export const metadata: Metadata = { title: "Categories · Admin" }

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("categories").select("id, slug, name, description, icon, sort_order").order("sort_order")
  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <p className="mb-3 text-sm font-semibold">Add a startup category</p>
        <p className="mb-4 text-xs text-muted-foreground">Each new category automatically gets its own community.</p>
        <CategoryForm />
      </Panel>
      <Panel className="divide-y">
        {(data ?? []).map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <CategoryIcon name={c.icon} size="sm" seed={i} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.description}</p>
            </div>
            <CategoryRowActions category={{ id: c.id, name: c.name, description: c.description ?? "", icon: c.icon }} />
          </div>
        ))}
      </Panel>
    </div>
  )
}
