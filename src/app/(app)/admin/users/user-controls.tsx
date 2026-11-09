"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { revokeVerification, setSuspended, setUserRole } from "@/actions/admin"
import { NativeSelect } from "@/components/shared/native-select"
import { Button } from "@/components/ui/button"
import { ROLES, type AppRole } from "@/lib/constants"

export function UserControls({ id, role, suspended, verified, isSelf }: { id: string; role: AppRole; suspended: boolean; verified: boolean; isSelf: boolean }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn()
      r.ok ? (toast.success(r.message), router.refresh()) : toast.error(r.error)
    })
  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label="Role"
        value={role}
        disabled={pending || isSelf}
        onChange={(e) => run(() => setUserRole(id, e.target.value as AppRole))}
        className="h-8 w-36 text-xs"
      >
        {(Object.keys(ROLES) as AppRole[]).map((r) => (
          <option key={r} value={r}>
            {ROLES[r]}
          </option>
        ))}
      </NativeSelect>
      {!isSelf && (
        <Button size="xs" variant={suspended ? "outline" : "destructive"} disabled={pending} onClick={() => (suspended || confirm("Suspend this user? They will lose access immediately.")) && run(() => setSuspended(id, !suspended))}>
          {suspended ? "Reinstate" : "Suspend"}
        </Button>
      )}
      {verified && (
        <Button size="xs" variant="ghost" disabled={pending} onClick={() => confirm("Revoke this founder's verification?") && run(() => revokeVerification("profile", id))}>
          Revoke ✓
        </Button>
      )}
    </div>
  )
}
