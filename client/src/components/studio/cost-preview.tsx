import * as React from "react"
import { Link } from "react-router"

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
import { isApiError } from "@/lib/api/client"
import type { Estimate, JobInput, JobKind } from "@/lib/api/types"
import { formatCredits } from "@/lib/format"
import { formatUsd } from "@/lib/studio-meta"
import { useEstimate } from "@/hooks/use-jobs"

const DEBOUNCE_MS = 700

interface CostPreviewProps {
  kind: JobKind
  input: JobInput
  /** Only when local validation passes is the server asked for an estimate. */
  isValid: boolean
  /** One line under the title, e.g. "Sound effect · 1 output". */
  description: string
  onEstimate?: (estimate: Estimate | null) => void
  /** True while submission must be blocked (USD cap 0 → capability gone). */
  onBlockedChange?: (blocked: boolean) => void
}

function EstimateAmount({ estimate }: { estimate: Estimate }) {
  if (estimate.billing === "credits") {
    return (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">Reserved credits</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatCredits(estimate.credits ?? 0)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">Available budget</span>
          <span className="font-mono tabular-nums">
            {formatCredits(estimate.availableCredits)}
          </span>
        </div>
      </>
    )
  }
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground">Estimated cash cost</span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {estimate.usd !== null ? formatUsd(estimate.usd) : "Not documented"}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground">Available this month</span>
        <span className="font-mono tabular-nums">
          {formatUsd(estimate.availableUsd)}
        </span>
      </div>
      {estimate.usd === null ? (
        <p className="text-muted-foreground">
          The provider does not document this price. Nothing is reserved up
          front; the settled charge stays pending until reconciled.
        </p>
      ) : null}
    </>
  )
}

/**
 * Shared cost preview for all R2 kinds: credits vs pay-as-you-go USD vs
 * undocumented pricing, and an explicit block when the USD cap is 0.
 */
export function CostPreview({
  kind,
  input,
  isValid,
  description,
  onEstimate,
  onBlockedChange,
}: CostPreviewProps) {
  const estimate = useEstimate()
  const { mutate, reset } = estimate
  const serialized = JSON.stringify(input)

  const capabilityBlocked =
    estimate.isError &&
    isApiError(estimate.error) &&
    estimate.error.code === "CAPABILITY_UNAVAILABLE"

  React.useEffect(() => {
    onBlockedChange?.(capabilityBlocked)
  }, [capabilityBlocked, onBlockedChange])

  React.useEffect(() => {
    if (!isValid) {
      reset()
      onEstimate?.(null)
      return undefined
    }
    const handle = window.setTimeout(() => {
      mutate(
        { kind, input: JSON.parse(serialized) as JobInput },
        {
          onSuccess: (data) => onEstimate?.(data),
          onError: () => onEstimate?.(null),
        }
      )
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, kind, isValid, mutate, reset])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs">
          Cost preview
          {estimate.isPending ? <Spinner className="size-3" /> : null}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        {!isValid ? (
          <p className="text-muted-foreground">
            Complete the form to preview the cost of this generation.
          </p>
        ) : capabilityBlocked ? (
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-destructive">
              Pay-as-you-go is switched off
            </p>
            <p className="text-muted-foreground">
              {isApiError(estimate.error)
                ? estimate.error.message
                : "This operation bills real cash and the monthly USD cap is 0."}
            </p>
            <p>
              <Link
                to="/settings"
                className="font-medium underline underline-offset-2"
              >
                Set a USD monthly cap in Settings
              </Link>{" "}
              to enable it. Submission stays blocked until then.
            </p>
          </div>
        ) : estimate.isError ? (
          <QueryError
            title="Estimate unavailable"
            error={estimate.error}
            onRetry={() =>
              estimate.mutate({
                kind,
                input: JSON.parse(serialized) as JobInput,
              })
            }
          />
        ) : estimate.data ? (
          <>
            <EstimateAmount estimate={estimate.data} />
            <Separator />
            <p className="text-muted-foreground">{estimate.data.assumption}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">
                {estimate.data.billing === "usd"
                  ? "Pay-as-you-go (cash)"
                  : "Credits"}
              </Badge>
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
