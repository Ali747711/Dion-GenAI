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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { Variant } from "@/lib/api/types"
import { formatDuration } from "@/lib/format"
import { useAsset } from "@/hooks/use-assets"

/**
 * Single-output result card (sound, speech, voice previews): real status,
 * play/download/favorite once the asset is stored. Progress stays
 * indeterminate unless the provider reported one.
 */
export function ResultAssetCard({
  variant,
  title,
}: {
  variant: Variant
  title: string
}) {
  const inFlight = variant.status === "pending" || variant.status === "running"
  const { data: asset, isLoading: assetLoading } = useAsset(
    variant.assetId ?? undefined
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs">
          <span className="truncate">{title}</span>
          <VariantStatusBadge status={variant.status} />
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
          <Progress value={variant.progress} aria-label={`${title} progress`} />
        ) : null}
        {variant.status === "failed" && variant.errorMessage ? (
          <p className="text-xs text-destructive">{variant.errorMessage}</p>
        ) : null}
        {variant.status === "unknown" ? (
          <p className="text-xs text-muted-foreground">
            The provider state of this output is unknown; it is kept for
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
          {asset ? <span>{asset.mimeType}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
