import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { UsdUsage } from "@/lib/api/studio-types"
import { formatUsd } from "@/lib/studio-meta"

function UsdStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.7rem] text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums">
        {value}
      </span>
      {hint ? (
        <span className="text-[0.65rem] text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

/**
 * USD pay-as-you-go summary, kept visually separate from the credit budget:
 * these are real cash amounts in live mode, not provider credits.
 */
export function UsdSummary({ usd }: { usd: UsdUsage }) {
  const capIsZero = /^0+(\.0+)?$/.test(usd.monthlyCap)
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs">
          Pay-as-you-go (cash)
          <Badge variant="outline">USD</Badge>
        </CardTitle>
        <CardDescription>
          Cash spending for sound, speech, voices, and transcription — separate
          from credits. Real money in live mode.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UsdStat
            label="Monthly cap"
            value={formatUsd(usd.monthlyCap)}
            hint="Set in Settings; 0 disables cash kinds."
          />
          <UsdStat
            label="Confirmed this month"
            value={formatUsd(usd.confirmedThisMonth)}
            hint="Settled cash charges recorded by this app."
          />
          <UsdStat
            label="Pending"
            value={formatUsd(usd.pending)}
            hint="Held for in-flight or unreconciled jobs."
          />
          <UsdStat
            label="Available"
            value={formatUsd(usd.available)}
            hint="Cap minus confirmed and pending."
          />
        </div>
        {capIsZero ? (
          <p className="text-[0.7rem] text-muted-foreground">
            The cap is 0, so all cash-billed studios are blocked.{" "}
            <Link
              to="/settings"
              className="font-medium underline underline-offset-2"
            >
              Set a cap in Settings
            </Link>{" "}
            to enable them.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
