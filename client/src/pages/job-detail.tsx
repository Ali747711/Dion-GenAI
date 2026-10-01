import type * as React from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, RefreshIcon } from "@hugeicons/core-free-icons"
import { isTerminalJobStatus } from "@/lib/api/types"

import { VariantCard } from "@/components/jobs/variant-card"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { JobStatusBadge } from "@/components/shared/status-badges"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCredits, formatDateTime } from "@/lib/format"
import { ERROR_CLASS_MESSAGES, JOB_STATUS_META } from "@/lib/job-meta"
import {
  formatUsd,
  isCoverJob,
  isMusicJob,
  JOB_KIND_LABELS,
  jobDisplayTitle,
} from "@/lib/studio-meta"
import { useCancelJob, useJob } from "@/hooks/use-jobs"

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </div>
  )
}

/** Job detail: status, attempts, honest error guidance, cancel, variants. */
export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const job = useJob(id)
  const cancel = useCancelJob()

  if (job.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (job.isError || !job.data) {
    return (
      <QueryError
        title="Job not found"
        error={job.error ?? new Error("This job does not exist.")}
        onRetry={() => void job.refetch()}
      />
    )
  }

  const data = job.data
  const meta = JOB_STATUS_META[data.status]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={jobDisplayTitle(data)}
        description={`Job ${data.id}`}
        actions={
          <>
            {data.status === "queued" ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(data.id, {
                    onSuccess: () =>
                      toast.success("Job cancelled before dispatch"),
                    onError: (cause) =>
                      toast.error(
                        cause instanceof Error
                          ? cause.message
                          : "Cancel failed — the job may already be submitted."
                      ),
                  })
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} data-icon="inline-start" />
                Cancel
              </Button>
            ) : null}
            {isMusicJob(data) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void navigate("/create/music", {
                    state: { input: data.input },
                  })
                }
              >
                <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" />
                Regenerate
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <JobStatusBadge status={data.status} />
        <Badge variant="outline">
          {JOB_KIND_LABELS[data.kind] ?? data.kind}
        </Badge>
        <Badge variant="outline">
          {data.billing === "usd" ? "Pay-as-you-go (cash)" : "Credits"}
        </Badge>
        <Badge variant="outline">{data.pricingVersion}</Badge>
        <span className="text-xs text-muted-foreground">
          Attempts: {data.attempts}
        </span>
      </div>

      {meta.description ? (
        <Alert>
          <AlertTitle>{meta.label}</AlertTitle>
          <AlertDescription>{meta.description}</AlertDescription>
        </Alert>
      ) : null}

      {data.errorClass ? (
        <Alert variant="destructive">
          <AlertTitle>What happened</AlertTitle>
          <AlertDescription>
            {ERROR_CLASS_MESSAGES[data.errorClass]}
            {data.errorMessage ? (
              <span className="mt-1 block font-mono text-[0.7rem]">
                {data.errorMessage}
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {data.variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              jobFinished={isTerminalJobStatus(data.status)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs">Billing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {data.billing === "usd" ? (
                <>
                  <DetailRow
                    label="Estimated cash cost"
                    value={
                      data.estimateUsd !== null
                        ? formatUsd(data.estimateUsd)
                        : "Not documented"
                    }
                  />
                  <DetailRow
                    label="Charged (USD)"
                    value={
                      data.chargedUsd !== null
                        ? formatUsd(data.chargedUsd)
                        : "Not settled yet"
                    }
                  />
                </>
              ) : (
                <>
                  <DetailRow
                    label="Reserved credits"
                    value={formatCredits(data.estimateCredits)}
                  />
                  <DetailRow
                    label="Charged credits"
                    value={
                      data.chargedCredits !== null
                        ? formatCredits(data.chargedCredits)
                        : "Not settled yet"
                    }
                  />
                </>
              )}
              <DetailRow label="Pricing version" value={data.pricingVersion} />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <DetailRow
                label="Created"
                value={formatDateTime(data.createdAt)}
              />
              <DetailRow
                label="Submitted"
                value={formatDateTime(data.submittedAt)}
              />
              <DetailRow
                label="Completed"
                value={formatDateTime(data.completedAt)}
              />
              <DetailRow
                label="Updated"
                value={formatDateTime(data.updatedAt)}
              />
              <DetailRow
                label="Provider task"
                value={data.providerTaskId ?? "—"}
              />
            </CardContent>
          </Card>

          {isMusicJob(data) || isCoverJob(data) ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-xs">Brief</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {isMusicJob(data) ? (
                  <>
                    <p className="text-xs leading-relaxed">
                      {data.input.prompt}
                    </p>
                    {data.input.lyricsMode === "generate" &&
                    data.input.lyricsPrompt ? (
                      <p className="text-xs text-muted-foreground">
                        Lyrics brief: {data.input.lyricsPrompt}
                      </p>
                    ) : null}
                    {data.input.tags && data.input.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {data.input.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : isCoverJob(data) ? (
                  <>
                    {data.input.musicDescription ? (
                      <p className="text-xs leading-relaxed">
                        {data.input.musicDescription}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1">
                      {data.input.style ? (
                        <Badge variant="secondary">{data.input.style}</Badge>
                      ) : null}
                      <Badge variant="secondary">
                        {data.input.melodyAdherence === "high"
                          ? "High adherence"
                          : "Main melody"}
                      </Badge>
                    </div>
                  </>
                ) : null}
                {data.projectId ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="self-start px-0"
                    nativeButton={false}
                    render={
                      <Link to={`/projects/${data.projectId}`}>
                        View project
                      </Link>
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
