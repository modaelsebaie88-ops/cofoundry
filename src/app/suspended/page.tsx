import { ShieldOff } from "lucide-react"
import { signOut } from "@/actions/auth"
import { Button } from "@/components/ui/button"

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldOff className="size-6" />
      </div>
      <h1 className="text-xl font-semibold">Your account is suspended</h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        An administrator suspended this account for violating the community guidelines. If you believe this is a mistake, contact the Cofoundry team.
      </p>
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  )
}
