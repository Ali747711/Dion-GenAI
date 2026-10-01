import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { isApiError } from "@/lib/api/client"

interface QueryErrorProps {
  title?: string
  error: unknown
  onRetry?: () => void
}

/** Recoverable error state: an Alert with the envelope message and a retry. */
export function QueryError({
  title = "Something went wrong",
  error,
  onRetry,
}: QueryErrorProps) {
  const message = isApiError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : "The request failed."
  const requestId = isApiError(error) ? error.requestId : null

  return (
    <Alert variant="destructive">
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message}
        {requestId ? (
          <span className="block text-xs opacity-70">
            Request ID: {requestId}
          </span>
        ) : null}
      </AlertDescription>
      {onRetry ? (
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
            Retry
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  )
}
