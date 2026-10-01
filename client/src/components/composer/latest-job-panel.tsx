import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { MusicNote01Icon, RefreshIcon } from "@hugeicons/core-free-icons"

import { JobStateIllustration } from "@/components/jobs/job-state-illustration"
import { VariantCard } from "@/components/jobs/variant-card"
import { QueryError } from "@/components/shared/query-error"
import { JobStatusBadge } from "@/components/shared/status-badges"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { listJobs } from "@/lib/api/endpoints"
import type { MusicInput } from "@/lib/api/types"
import { isTerminalJobStatus } from "@/lib/api/types"
import { formatRelativeTime } from "@/lib/format"
import { JOB_STATUS_META } from "@/lib/job-meta"
import { isMusicJob, jobDisplayTitle } from "@/lib/studio-meta"
import { useCancelJob, useJob } from "@/hooks/use-jobs"

interface LatestJobPanelProps {
  jobId: string | undefined
  onRegenerate: (input: MusicInput) => void
}

/** The most recent generation pair, polled while it is still in flight. */
export function LatestJobPanel({ jobId, onRegenerate }: LatestJobPanelProps) {
  const fallback = useQuery({
    queryKey: ["jobs", "latest"],
    queryFn: async () =>
      (await listJobs({ kind: "music", limit: 1 })).data[0] ?? null,
    enabled: jobId === undefined,
  })

  const activeId = jobId ?? fallback.data?.id
  const job = useJob(activeId)
  const cancel = useCancelJob()

  if (jobId === undefined && fallback.isLoading) {
    return <Skeleton className="h-56 w-full" />
  }
  if (jobId === undefined && fallback.isError) {
    return (
      <QueryError
        title="Could not load your latest generation"
        error={fallback.error}
        onRetry={() => void fallback.refetch()}
      />
    )
  }
  if (!activeId) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={MusicNote01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No generations yet</EmptyTitle>
          <EmptyDescription>
            Your latest song pair will appear here once you submit a brief.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  if (job.isLoading) {
    return <Skeleton className="h-56 w-full" />
  }
  if (job.isError || !job.data) {
    return (
      <QueryError
        title="Could not load the job"
        error={job.error ?? new Error("Job not found")}
        onRetry={() => void job.refetch()}
      />
    )
  }

  const data = job.data
  const meta = JOB_STATUS_META[data.status]

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-xs">
          <span className="truncate">{jobDisplayTitle(data)}</span>
          <JobStatusBadge status={data.status} />
        </CardTitle>
        <CardDescription>
          Submitted {formatRelativeTime(data.createdAt)} ·{" "}
          <Link
            to={`/jobs/${data.id}`}
            className="underline underline-offset-2"
          >
            Job details
          </Link>
        </CardDescription>
        {isMusicJob(data) ? (
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate(data.input)}
            >
              <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
              Regenerate
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {meta.description ? (
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        ) : null}
        <JobStateIllustration job={data} />
        {data.variants.map((variant) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            jobFinished={isTerminalJobStatus(data.status)}
          />
        ))}
        {data.status === "queued" ? (
          <Button
            variant="destructive"
            size="sm"
            className="self-start"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(data.id)}
          >
            Cancel before dispatch
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
