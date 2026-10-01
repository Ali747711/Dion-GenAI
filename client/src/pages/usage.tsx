import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon } from "@hugeicons/core-free-icons"

import { ListSkeleton } from "@/components/shared/list-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { ReconcileDialog } from "@/components/usage/reconcile-dialog"
import { UsageChart } from "@/components/usage/usage-chart"
import { UsdSummary } from "@/components/usage/usd-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { LedgerEntry, Usage, UsageWarning } from "@/lib/api/types"
import { formatCredits, formatDateTime, formatRelativeTime } from "@/lib/format"
import { formatUsd } from "@/lib/studio-meta"
import { useLedger, useUsage } from "@/hooks/use-usage"

const WARNING_COPY: Record<UsageWarning, { title: string; body: string }> = {
  low_budget: {
    title: "Budget running low",
    body: "The locally estimated remaining budget is low. New generations may be rejected by the local reservation check.",
  },
  unverified_pricing: {
    title: "Unverified pricing",
    body: "Estimates use documented rates that have not been verified against this account. Final charges may differ.",
  },
  stale_reconciliation: {
    title: "Reconciliation is stale",
    body: "The local ledger has not been reconciled against provider evidence recently. The estimate may drift from reality.",
  },
  pending_reconciliation: {
    title: "Charges awaiting reconciliation",
    body: "Some jobs have uncertain final charges. Their reservations stay pending until evidence is recorded.",
  },
  usd_cap_unset: {
    title: "USD cap not set",
    body: "The pay-as-you-go monthly cap is 0, so cash-billed studios (sound, speech, voices, transcription) are blocked. Set a cap in Settings to enable them.",
  },
}

const LEDGER_KIND_LABEL: Record<LedgerEntry["kind"], string> = {
  allocation: "Allocation",
  reservation: "Reservation",
  reservation_release: "Reservation release",
  charge: "Charge",
  adjustment: "Adjustment",
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-lg tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="text-[0.7rem] text-muted-foreground">
          {hint}
        </CardContent>
      ) : null}
    </Card>
  )
}

function SummaryGrid({ usage }: { usage: Usage }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Starting allocation"
        value={formatCredits(usage.startingAllocation)}
        hint="Owner-reported, not a verified provider balance."
      />
      <StatCard
        label="Confirmed spend"
        value={formatCredits(usage.confirmedCredits)}
        hint="Settled charges recorded by this app."
      />
      <StatCard
        label="Pending reservations"
        value={formatCredits(usage.pendingCredits)}
        hint="Held for in-flight or unreconciled jobs."
      />
      <StatCard
        label="Estimated remaining"
        value={formatCredits(usage.estimatedRemaining)}
        hint="Local estimate — never a live provider balance."
      />
    </div>
  )
}

function EnvelopesTable({ usage }: { usage: Usage }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Envelope</TableHead>
          <TableHead className="text-right">Allocated</TableHead>
          <TableHead className="text-right">Confirmed</TableHead>
          <TableHead className="text-right">Pending</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usage.envelopes.map((envelope) => (
          <TableRow key={envelope.key}>
            <TableCell className="font-medium">{envelope.label}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatCredits(envelope.allocated)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatCredits(envelope.confirmedCredits)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatCredits(envelope.pendingCredits)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell className="text-muted-foreground">
            Unallocated reserve
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatCredits(usage.reserveCredits)}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">—</TableCell>
          <TableCell className="text-right text-muted-foreground">—</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function LedgerSection() {
  const ledger = useLedger()
  const entries = ledger.data?.pages.flatMap((page) => page.data) ?? []

  if (ledger.isLoading) return <ListSkeleton rows={5} rowClassName="h-8" />
  if (ledger.isError) {
    return (
      <QueryError
        title="Could not load the ledger"
        error={ledger.error}
        onRetry={() => void ledger.refetch()}
      />
    )
  }
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No ledger entries yet. Allocations, reservations, charges, and
        adjustments will appear here.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kind</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="hidden md:table-cell">Note</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {LEDGER_KIND_LABEL[entry.kind]}
                  {entry.jobId ? (
                    <Link
                      to={`/jobs/${entry.jobId}`}
                      className="text-muted-foreground underline underline-offset-2"
                    >
                      job
                    </Link>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {entry.currency === "usd"
                  ? formatUsd(entry.usdEstimate)
                  : `${entry.credits > 0 ? "+" : ""}${formatCredits(entry.credits)}`}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.currency === "usd" ? "USD" : "Credits"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.source}
              </TableCell>
              <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                {entry.note ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRelativeTime(entry.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {ledger.hasNextPage ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={ledger.isFetchingNextPage}
          onClick={() => void ledger.fetchNextPage()}
        >
          {ledger.isFetchingNextPage ? <Spinner data-icon="inline-start" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  )
}

/** Usage: local budget estimate, warnings, envelopes, 30-day chart, ledger. */
export function UsagePage() {
  const usage = useUsage()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Usage"
        description="Local estimate of credit budget and spending. This is not a live provider balance."
        actions={<ReconcileDialog />}
      />

      {usage.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : usage.isError ? (
        <QueryError
          title="Could not load usage"
          error={usage.error}
          onRetry={() => void usage.refetch()}
        />
      ) : usage.data ? (
        <>
          {usage.data.warnings.map((warning) => (
            <Alert key={warning} variant="destructive">
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
              <AlertTitle>{WARNING_COPY[warning].title}</AlertTitle>
              <AlertDescription>{WARNING_COPY[warning].body}</AlertDescription>
            </Alert>
          ))}

          <SummaryGrid usage={usage.data} />

          {usage.data.usd ? <UsdSummary usd={usage.data.usd} /> : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Local estimate</Badge>
            <span>
              Last reconciliation:{" "}
              {usage.data.lastReconciledAt
                ? formatDateTime(usage.data.lastReconciledAt)
                : "never"}
            </span>
            <span>
              Adjustments: {formatCredits(usage.data.adjustmentsCredits)}
            </span>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-xs">Last 30 days</CardTitle>
                <CardDescription>Confirmed charges per day.</CardDescription>
              </CardHeader>
              <CardContent>
                <UsageChart byDay={usage.data.byDay} />
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-xs">Budget envelopes</CardTitle>
                <CardDescription>
                  Planning envelopes, enforced by local reservations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnvelopesTable usage={usage.data} />
              </CardContent>
            </Card>
          </div>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs">Ledger</CardTitle>
              <CardDescription>
                Every allocation, reservation, charge, and adjustment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LedgerSection />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
