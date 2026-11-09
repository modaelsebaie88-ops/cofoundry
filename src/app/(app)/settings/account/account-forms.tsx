"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { changeEmail, changePassword, deleteAccount } from "@/actions/account"
import { Field } from "@/components/shared/form"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AccountForms({ email, usesPassword }: { email: string; usesPassword: boolean }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [newEmail, setNewEmail] = useState(email)
  const [confirmText, setConfirmText] = useState("")
  const [pending, start] = useTransition()

  return (
    <>
      {usesPassword && (
        <Panel className="p-5 sm:p-8">
          <SectionTitle>Change password</SectionTitle>
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              start(async () => {
                const r = await changePassword(current, next)
                if (r.ok) {
                  toast.success(r.message)
                  setCurrent("")
                  setNext("")
                } else toast.error(r.error)
              })
            }}
          >
            <Field label="Current password">
              <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-10" />
            </Field>
            <Field label="New password">
              <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="h-10" />
            </Field>
            <Button type="submit" className="h-10" disabled={pending || !current || next.length < 8}>
              {pending && <Loader2 className="animate-spin" />} Update
            </Button>
          </form>
        </Panel>
      )}
      <Panel className="p-5 sm:p-8">
        <SectionTitle>Email address</SectionTitle>
        <form
          className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await changeEmail(newEmail)
              r.ok ? toast.success(r.message) : toast.error(r.error)
            })
          }}
        >
          <Field label="Email" hint="We'll send confirmation links to both the old and new address.">
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-10" />
          </Field>
          <Button type="submit" variant="outline" className="h-10" disabled={pending || newEmail === email}>
            Change email
          </Button>
        </form>
      </Panel>
      <Panel className="border-destructive/30 p-5 sm:p-8">
        <SectionTitle>Delete account</SectionTitle>
        <p className="text-sm text-muted-foreground">Permanently deletes your profile, startup, messages, posts and all associated data. This cannot be undone.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label='Type "DELETE" to confirm'>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="h-10" />
          </Field>
          <Button
            variant="destructive"
            className="h-10"
            disabled={pending || confirmText !== "DELETE"}
            onClick={() =>
              start(async () => {
                const r = await deleteAccount(confirmText)
                if (r && !r.ok) toast.error(r.error)
              })
            }
          >
            Delete my account
          </Button>
        </div>
      </Panel>
    </>
  )
}
