import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon } from "@hugeicons/core-free-icons"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { CapabilityKey } from "@/lib/api/types"
import { useCapability } from "@/hooks/use-workspace"

/**
 * Inline banner when a studio's capability is reported unavailable — most
 * commonly the USD pay-as-you-go cap being 0. The form stays visible so the
 * owner can see what the studio does, but submission is blocked elsewhere.
 */
export function CapabilityNotice({
  capabilityKey,
}: {
  capabilityKey: CapabilityKey
}) {
  const { capability } = useCapability(capabilityKey)
  if (!capability || capability.available) return null

  return (
    <Alert>
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
      <AlertTitle>This studio is currently blocked</AlertTitle>
      <AlertDescription>
        {capability.reason ??
          "The capability is reported unavailable by the backend."}{" "}
        <Link to="/settings" className="font-medium underline underline-offset-2">
          Open Settings
        </Link>
      </AlertDescription>
    </Alert>
  )
}
