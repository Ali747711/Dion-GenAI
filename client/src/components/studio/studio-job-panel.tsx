import type * as React from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"

import { JobStateIllustration } from "@/components/jobs/job-state-illustration"
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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Job, JobKind } from "@/lib/api/types"
import { formatRelativeTime } from "@/lib/format"
import { JOB_STATUS_META } from "@/lib/job-meta"
import { useCancelJob, useJob, useLatestJobId } from "@/hooks/use-jobs"

interface StudioJobPanelProps {
  kind: JobKind
  /** Job submitted in this session; falls back to the newest job of `kind`. */
  jobId: string | undefined
  title: string
  emptyIcon: IconSvgElement
  emptyTitle: string
  emptyDescription: string
  /** Kind-specific outputs (variants, structured result). */
  children: (job: Job) => React.ReactNode
}

/**
 * Shared latest-job panel for the studios: resolves the most recent job of
 * one kind, polls it until terminal, and shows honest status/error states.
 */
export function StudioJobPanel({
  kind,
  jobId,
  title,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
}: StudioJobPanelProps) {
  const fallback = useLatestJobId(kind, jobId === undefined)
  const activeId = jobId ?? fallback.data ?? undefined
  const job = useJob(activeId)
  const cancel = useCancelJob()

  if (jobId === undefined && fallback.isLoading) {
    return <Skeleton className="h-48 w-full" />
  }
  if (jobId === undefined && fallback.isError) {
    return (
      <QueryError
        title="Could not load the latest result"
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
            <HugeiconsIcon icon={emptyIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  if (job.isLoading) {
    return <Skeleton className="h-48 w-full" />
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
          <span className="truncate">{title}</span>
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
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {meta.description ? (
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        ) : null}
        <JobStateIllustration job={data} />
        {children(data)}
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
