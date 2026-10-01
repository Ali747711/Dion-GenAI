import { Link, useLocation } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Login01Icon } from "@hugeicons/core-free-icons"

import { DionMascot } from "@/components/shared/dion-mascot"
import { QueryError } from "@/components/shared/query-error"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useAuth } from "@/providers/auth-provider"

/**
 * Shown in place of every page while signed out. The backend still rejects
 * all workspace data without a session, so nothing private is fetched here.
 */
export function SignedOutState() {
  const location = useLocation()
  const { sessionError, retrySession } = useAuth()

  if (sessionError) {
    return (
      <QueryError
        title="API unreachable"
        error={new Error(sessionError)}
        onRetry={retrySession}
      />
    )
  }

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <DionMascot variant="producer" size="lg" loading="eager" />
        </EmptyMedia>
        <EmptyTitle>Sign in to start creating</EmptyTitle>
        <EmptyDescription>
          Your tracks, jobs, and budget stay private until you sign in.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          nativeButton={false}
          render={<Link to="/login" state={{ from: location.pathname }} />}
        >
          <HugeiconsIcon icon={Login01Icon} data-icon="inline-start" />
          Sign in
        </Button>
      </EmptyContent>
    </Empty>
  )
}
