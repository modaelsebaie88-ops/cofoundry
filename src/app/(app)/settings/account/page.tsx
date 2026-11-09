import type { Metadata } from "next"
import { getCurrentUser, requireProfile } from "@/lib/auth"
import { ROLES } from "@/lib/constants"
import { Panel, SectionTitle } from "@/components/shared/page-header"
import { AccountForms } from "./account-forms"

export const metadata: Metadata = { title: "Account" }

export default async function AccountPage() {
  const me = await requireProfile()
  const user = await getCurrentUser()
  const provider = user?.app_metadata?.provider ?? "email"
  return (
    <div className="space-y-6">
      <Panel className="p-5 sm:p-8">
        <SectionTitle>Account</SectionTitle>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sign-in method</dt>
            <dd className="font-medium capitalize">{provider}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="font-medium">{ROLES[me.role]}</dd>
          </div>
        </dl>
      </Panel>
      <AccountForms email={user?.email ?? ""} usesPassword={provider === "email"} />
    </div>
  )
}
