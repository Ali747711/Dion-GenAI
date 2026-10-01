import {
  DownloadAssetButton,
  FavoriteAssetButton,
  PlayAssetButton,
} from "@/components/library/asset-actions"
import { VariantStatusBadge } from "@/components/shared/status-badges"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { Variant } from "@/lib/api/types"
import { formatDuration } from "@/lib/format"
import { useAsset } from "@/hooks/use-assets"

const VARIANT_LABELS = ["Variant A", "Variant B"] as const

/**
 * One of the two variants of a music job. Progress is indeterminate unless
 * the provider reported a real percentage (never invented).
 */
export function VariantCard({
  variant,
  jobFinished = false,
}: {
  variant: Variant
  /** Parent job is terminal; a still-pending variant was never generated. */
  jobFinished?: boolean
}) {
  const unstarted = variant.status === "pending" || variant.status === "running"
  const notGenerated = jobFinished && unstarted
  const inFlight = unstarted && !jobFinished
  const { data: asset, isLoading: assetLoading } = useAsset(
    variant.assetId ?? undefined
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs">
          {VARIANT_LABELS[variant.index]}
          {notGenerated ? (
            <Badge variant="outline">Not generated</Badge>
          ) : (
            <VariantStatusBadge status={variant.status} />
          )}
        </CardTitle>
        <CardAction className="flex items-center gap-0.5">
          {asset ? (
            <>
              <PlayAssetButton asset={asset} />
              <FavoriteAssetButton asset={asset} />
              <DownloadAssetButton asset={asset} />
            </>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {inFlight ? (
          <Progress
            value={variant.progress}
            aria-label={`${VARIANT_LABELS[variant.index]} progress`}
          />
        ) : null}
        {variant.status === "failed" && variant.errorMessage ? (
          <p className="text-xs text-destructive">{variant.errorMessage}</p>
        ) : null}
        {variant.status === "unknown" ? (
          <p className="text-xs text-muted-foreground">
            The provider state of this variant is unknown; it is kept for
            reconciliation instead of being retried automatically.
          </p>
        ) : null}
        {variant.assetId && assetLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : null}
        <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground">
          <span className="font-mono tabular-nums">
            {formatDuration(
              variant.durationSeconds ?? asset?.durationSeconds ?? null
            )}
          </span>
          {variant.progress !== null && inFlight ? (
            <span>{Math.round(variant.progress)}%</span>
          ) : null}
          {asset?.projectName ? <span>{asset.projectName}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
