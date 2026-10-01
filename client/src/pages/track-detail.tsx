import type * as React from "react"
import { Link, useParams } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDataTransferHorizontalIcon } from "@hugeicons/core-free-icons"

import {
  DownloadAssetButton,
  FavoriteAssetButton,
  PlayAssetButton,
} from "@/components/library/asset-actions"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { JobStatusBadge } from "@/components/shared/status-badges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatBytes,
  formatCredits,
  formatDateTime,
  formatDuration,
} from "@/lib/format"
import { useAsset } from "@/hooks/use-assets"
import { useJob } from "@/hooks/use-jobs"

const VARIANT_LABELS = ["Variant A", "Variant B"] as const

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </div>
  )
}

/** Track detail: playback, lyrics, provenance, sibling variant, usage. */
export function TrackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const asset = useAsset(id)
  const job = useJob(asset.data?.jobId ?? undefined)

  if (asset.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (asset.isError || !asset.data) {
    return (
      <QueryError
        title="Track not found"
        error={asset.error ?? new Error("This track does not exist.")}
        onRetry={() => void asset.refetch()}
      />
    )
  }

  const track = asset.data

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={track.title}
        description={
          track.variantIndex !== null
            ? `${VARIANT_LABELS[track.variantIndex]} of a generated pair`
            : "Library track"
        }
        actions={
          <>
            <PlayAssetButton asset={track} />
            <FavoriteAssetButton asset={track} />
            <DownloadAssetButton asset={track} />
            {track.siblingAssetId ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link to={`/tracks/${track.siblingAssetId}`}>
                    <HugeiconsIcon
                      icon={ArrowDataTransferHorizontalIcon}
                      data-icon="inline-start"
                    />
                    Other variant
                  </Link>
                }
              />
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-xs">Lyrics</CardTitle>
          </CardHeader>
          <CardContent>
            {track.lyrics ? (
              <ScrollArea className="h-72">
                <pre className="font-sans text-xs leading-relaxed whitespace-pre-wrap">
                  {track.lyrics}
                </pre>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground">
                No lyrics were stored for this track.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs">Provenance</CardTitle>
              <CardDescription>
                The brief this track was generated from.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {track.prompt ? (
                <p className="text-xs leading-relaxed">{track.prompt}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No prompt was stored.
                </p>
              )}
              {track.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {track.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {track.jobId ? (
                <Button
                  variant="link"
                  size="sm"
                  className="self-start px-0"
                  nativeButton={false}
                  render={
                    <Link to={`/jobs/${track.jobId}`}>View source job</Link>
                  }
                />
              ) : null}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs">Metadata & usage</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <MetaRow
                label="Duration"
                value={formatDuration(track.durationSeconds)}
              />
              <MetaRow label="Format" value={track.mimeType} />
              <MetaRow label="Size" value={formatBytes(track.bytes)} />
              <MetaRow
                label="Created"
                value={formatDateTime(track.createdAt)}
              />
              <MetaRow label="Project" value={track.projectName ?? "—"} />
              {job.data ? (
                <>
                  <MetaRow
                    label="Job status"
                    value={<JobStatusBadge status={job.data.status} />}
                  />
                  <MetaRow
                    label="Reserved credits"
                    value={formatCredits(job.data.estimateCredits)}
                  />
                  <MetaRow
                    label="Charged credits"
                    value={
                      job.data.chargedCredits !== null
                        ? formatCredits(job.data.chargedCredits)
                        : "Not settled yet"
                    }
                  />
                </>
              ) : track.jobId && job.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
