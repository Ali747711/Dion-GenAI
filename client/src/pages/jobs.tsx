import * as React from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Queue01Icon } from "@hugeicons/core-free-icons"

import { ListSkeleton } from "@/components/shared/list-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { JobStatusBadge } from "@/components/shared/status-badges"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCredits, formatRelativeTime } from "@/lib/format"
import { formatUsd, JOB_KIND_LABELS, jobDisplayTitle } from "@/lib/studio-meta"
import { useJobList } from "@/hooks/use-jobs"

const STATUS_ITEMS = [
  { label: "All statuses", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Running", value: "running" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Partial", value: "partially_succeeded" },
  { label: "Failed", value: "failed" },
  { label: "Submission unknown", value: "submission_unknown" },
  { label: "Needs reconciliation", value: "reconciliation_required" },
  { label: "Cancelled", value: "cancelled_before_submission" },
]

/** Jobs queue: status, credits, attempts, recovery states. */
export function JobsPage() {
  const [status, setStatus] = React.useState("all")
  const list = useJobList(status !== "all" ? { status } : {})
  const jobs = list.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Jobs"
        description="Every generation request, including recovery states."
        actions={
          <Select
            items={STATUS_ITEMS}
            value={status}
            onValueChange={(value: unknown) => {
              if (typeof value === "string") setStatus(value)
            }}
          >
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STATUS_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        }
      />

      {list.isLoading ? (
        <ListSkeleton rows={6} />
      ) : list.isError ? (
        <QueryError
          title="Could not load jobs"
          error={list.error}
          onRetry={() => void list.refetch()}
        />
      ) : jobs.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Queue01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>
              {status !== "all" ? "No jobs with this status" : "No jobs yet"}
            </EmptyTitle>
            <EmptyDescription>
              {status !== "all"
                ? "Try a different status filter."
                : "Submitted generations appear here with their full history."}
            </EmptyDescription>
          </EmptyHeader>
          {status === "all" ? (
            <Button nativeButton={false} render={<Link to="/create/music">Create music</Link>} />
          ) : null}
        </Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="max-w-64 truncate font-medium hover:underline"
                        >
                          {jobDisplayTitle(job)}
                        </Link>
                        <Badge variant="outline">
                          {JOB_KIND_LABELS[job.kind] ?? job.kind}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {job.billing === "usd"
                        ? formatUsd(job.estimateUsd)
                        : formatCredits(job.estimateCredits)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {job.billing === "usd"
                        ? job.chargedUsd !== null
                          ? formatUsd(job.chargedUsd)
                          : "—"
                        : job.chargedCredits !== null
                          ? formatCredits(job.chargedCredits)
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.attempts}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(job.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {jobs.map((job) => (
              <Card key={job.id} size="sm">
                <CardContent className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="truncate text-xs font-medium hover:underline"
                    >
                      {jobDisplayTitle(job)}
                    </Link>
                    <span className="text-[0.7rem] text-muted-foreground">
                      {JOB_KIND_LABELS[job.kind] ?? job.kind} ·{" "}
                      {formatRelativeTime(job.createdAt)} ·{" "}
                      {job.billing === "usd"
                        ? `${formatUsd(job.estimateUsd)} est.`
                        : `${formatCredits(job.estimateCredits)} reserved`}
                    </span>
                  </div>
                  <JobStatusBadge status={job.status} />
                </CardContent>
              </Card>
            ))}
          </div>

          {list.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Load more
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
