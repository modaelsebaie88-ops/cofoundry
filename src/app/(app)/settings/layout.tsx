import { PageHeader } from "@/components/shared/page-header"
import { SettingsNav } from "./settings-nav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, account, notifications and verification." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
