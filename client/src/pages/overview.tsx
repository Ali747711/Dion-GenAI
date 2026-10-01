import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Coins01Icon,
  MusicNote01Icon,
  Queue01Icon,
} from "@hugeicons/core-free-icons"

import { PlayAssetButton } from "@/components/library/asset-actions"
import { DionMascot } from "@/components/shared/dion-mascot"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { JobStatusBadge } from "@/components/shared/status-badges"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCredits, formatDuration, formatRelativeTime } from "@/lib/format"
import { jobDisplayTitle } from "@/lib/studio-meta"
import { useRecentAssets } from "@/hooks/use-assets"
import { useActiveJobs } from "@/hooks/use-jobs"
import { useUsage } from "@/hooks/use-usage"

function BudgetSummaryCard() {
  const usage = useUsage()
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs">
          <HugeiconsIcon
            icon={Coins01Icon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          Budget
        </CardTitle>
        <CardDescription>
          Local estimate — not a live provider balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-xs">
        {usage.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : usage.isError ? (
          <QueryError
            title="Budget unavailable"
            error={usage.error}
            onRetry={() => void usage.refetch()}
          />
        ) : usage.data ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Estimated remaining</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatCredits(usage.data.estimatedRemaining)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">
                Pending reservations
              </span>
              <span className="font-mono tabular-nums">
                {formatCredits(usage.data.pendingCredits)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Confirmed spend</span>
              <span className="font-mono tabular-nums">
                {formatCredits(usage.data.confirmedCredits)}
              </span>
            </div>
            <Button
              variant="link"
              size="sm"
              className="self-start px-0"
              nativeButton={false}
              render={<Link to="/usage">Usage details</Link>}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ActiveJobsCard() {
  const jobs = useActiveJobs()
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs">
          <HugeiconsIcon
            icon={Queue01Icon}
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
          />
          Active jobs
        </CardTitle>
        <CardDescription>
          Polled every few seconds while running.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {jobs.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : jobs.isError ? (
          <QueryError
            title="Jobs unavailable"
            error={jobs.error}
            onRetry={() => void jobs.refetch()}
          />
        ) : jobs.data && jobs.data.length > 0 ? (
          jobs.data.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-muted"
            >
              <span className="truncate">{jobDisplayTitle(job)}</span>
              <JobStatusBadge status={job.status} />
            </Link>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            Nothing in flight. Submissions appear here while they generate.
          </p>
        )}
        <Button
          variant="link"
          size="sm"
          className="self-start px-0"
          nativeButton={false}
          render={<Link to="/jobs">All jobs</Link>}
        />
      </CardContent>
    </Card>
  )
}

function RecentTracks() {
  const recent = useRecentAssets(6)
  if (recent.isLoading) {
    return <Skeleton className="h-40 w-full" />
  }
  if (recent.isError) {
    return (
      <QueryError
        title="Could not load recent tracks"
        error={recent.error}
        onRetry={() => void recent.refetch()}
      />
    )
  }
  if (!recent.data || recent.data.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>No tracks yet</EmptyTitle>
          <EmptyDescription>
            Your generated songs will appear here once the first job finishes.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      {recent.data.map((asset) => (
        <div
          key={asset.id}
          className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
        >
          <PlayAssetButton asset={asset} queue={recent.data} />
          <Link
            to={`/tracks/${asset.id}`}
            className="min-w-0 flex-1 truncate text-xs font-medium hover:underline"
          >
            {asset.title}
          </Link>
          <span className="font-mono text-[0.7rem] text-muted-foreground tabular-nums">
            {formatDuration(asset.durationSeconds)}
          </span>
          <span className="hidden text-[0.7rem] text-muted-foreground sm:block">
            {formatRelativeTime(asset.createdAt)}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Overview: create CTA, recent tracks, active jobs, budget — real data only. */
export function OverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* Welcome illustration: decorative, in the initial viewport (eager). */}
        <DionMascot variant="producer" size="sm" loading="eager" />
        <PageHeader
          className="flex-1"
          title="Overview"
          description="Your private music workspace."
          actions={
            <Button
              nativeButton={false}
              render={
                <Link to="/create/music">
                  <HugeiconsIcon
                    icon={MusicNote01Icon}
                    data-icon="inline-start"
                  />
                  Create music
                </Link>
              }
            />
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="sm" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs">Recent tracks</CardTitle>
            <CardDescription>
              Latest generated variants across all projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTracks />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <ActiveJobsCard />
          <BudgetSummaryCard />
        </div>
      </div>
    </div>
  )
}
