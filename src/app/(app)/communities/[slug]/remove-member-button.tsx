"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserMinus } from "lucide-react"
import { toast } from "sonner"
import { removeMember } from "@/actions/communities"
import { Button } from "@/components/ui/button"

export function RemoveMemberButton({ communityId, profileId, name }: { communityId: string; profileId: string; name: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${name} from community`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm(`Remove ${name} from this community?`)) return
          const r = await removeMember(communityId, profileId)
          r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
        })
      }
    >
      <UserMinus />
    </Button>
  )
}
