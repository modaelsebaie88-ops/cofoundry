"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteStartup } from "@/actions/profile"
import { Button } from "@/components/ui/button"

export function DeleteStartupButton() {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm("Permanently delete your startup profile?")) return
          const r = await deleteStartup()
          if (r.ok) {
            toast.success("Startup profile deleted")
            router.refresh()
          } else toast.error(r.error)
        })
      }
    >
      <Trash2 /> Delete startup
    </Button>
  )
}
