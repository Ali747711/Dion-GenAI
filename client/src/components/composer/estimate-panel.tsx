import * as React from "react"

import { QueryError } from "@/components/shared/query-error"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { Estimate, MusicInput } from "@/lib/api/types"
import { formatCredits } from "@/lib/format"
import { sanitizeMusicInput } from "@/lib/music-validation"
import { useEstimate } from "@/hooks/use-jobs"

const DEBOUNCE_MS = 700

interface EstimatePanelProps {
  input: MusicInput
  /** Local validation passed — only then is the server asked for an estimate. */
  isValid: boolean
  onEstimate?: (estimate: Estimate | null) => void
}

/**
 * Server-side estimate preview: operation, two expected variants, pricing
 * assumption, available local budget, and explicit final-cost uncertainty.
 */
export function EstimatePanel({
  input,
  isValid,
  onEstimate,
}: EstimatePanelProps) {
  const estimate = useEstimate()
  const { mutate, reset } = estimate
  const serialized = JSON.stringify(sanitizeMusicInput(input))

  React.useEffect(() => {
    if (!isValid) {
      reset()
      onEstimate?.(null)
      return undefined
    }
    const handle = window.setTimeout(() => {
      const parsed = JSON.parse(serialized) as MusicInput
      mutate(
        { kind: "music", input: parsed },
        {
          onSuccess: (data) => onEstimate?.(data),
          onError: () => onEstimate?.(null),
        }
      )
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, isValid, mutate, reset])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs">
          Cost estimate
          {estimate.isPending ? <Spinner className="size-3" /> : null}
        </CardTitle>
        <CardDescription>
          Original song · 2 variants generated per submission
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        {!isValid ? (
          <p className="text-muted-foreground">
            Complete the brief to preview the reservation for this generation.
          </p>
        ) : estimate.isError ? (
          <QueryError
            title="Estimate unavailable"
            error={estimate.error}
            onRetry={() =>
              estimate.mutate({
                kind: "music",
                input: JSON.parse(serialized) as MusicInput,
              })
            }
          />
        ) : estimate.data ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground">Reserved credits</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatCredits(estimate.data.credits ?? 0)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground">Available budget</span>
              <span className="font-mono tabular-nums">
                {formatCredits(estimate.data.availableCredits)}
              </span>
            </div>
            <Separator />
            <p className="text-muted-foreground">{estimate.data.assumption}</p>
            <p className="text-muted-foreground">
              The final cost may differ — it depends on the actual duration the
              provider generates.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{estimate.data.pricingVersion}</Badge>
              {!estimate.data.verified ? (
                <Badge variant="secondary">Unverified pricing</Badge>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Fetching estimate…</p>
        )}
      </CardContent>
    </Card>
  )
}
