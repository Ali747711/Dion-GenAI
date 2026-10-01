import * as React from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { BudgetConfig } from "@/lib/api/types"
import { formatDateTime } from "@/lib/format"
import {
  useBudget,
  useConnection,
  useUpdateBudget,
} from "@/hooks/use-workspace"

function ConnectionCard() {
  const connection = useConnection()
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs">Provider connection</CardTitle>
        <CardDescription>
          The API key lives only in the backend; the browser never sees it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {connection.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : connection.isError ? (
          <QueryError
            title="Connection status unavailable"
            error={connection.error}
            onRetry={() => void connection.refetch()}
          />
        ) : connection.data ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  connection.data.mode === "mock" ? "outline" : "default"
                }
              >
                {connection.data.mode === "mock" ? "Mock provider" : "Live"}
              </Badge>
              <Badge
                variant={
                  connection.data.status === "configured"
                    ? "secondary"
                    : "destructive"
                }
              >
                {connection.data.status}
              </Badge>
            </div>
            <p className="text-[0.7rem] text-muted-foreground">
              {connection.data.mode === "mock"
                ? "Mock mode simulates generations locally and never calls the provider or spends credits."
                : "Live mode sends paid requests to the provider."}{" "}
              Checked {formatDateTime(connection.data.checkedAt)}.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ThemeCard() {
  const { theme, setTheme } = useTheme()
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs">Theme</CardTitle>
        <CardDescription>Dark is the default for the studio.</CardDescription>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          variant="outline"
          value={[theme]}
          onValueChange={(groupValue: unknown[]) => {
            const next = groupValue[groupValue.length - 1]
            if (next === "dark" || next === "light" || next === "system") {
              setTheme(next)
            }
          }}
        >
          <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          <ToggleGroupItem value="light">Light</ToggleGroupItem>
          <ToggleGroupItem value="system">System</ToggleGroupItem>
        </ToggleGroup>
      </CardContent>
    </Card>
  )
}

function BudgetForm({ initial }: { initial: BudgetConfig }) {
  const update = useUpdateBudget()
  const [form, setForm] = React.useState<BudgetConfig>(initial)

  const setNumber = (
    value: string,
    apply: (parsed: number) => BudgetConfig | null
  ) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return
    const next = apply(Math.floor(parsed))
    if (next) setForm(next)
  }

  const handleSave = () => {
    if (!form) return
    update.mutate(
      {
        startingAllocation: form.startingAllocation,
        reserveCredits: form.reserveCredits,
        envelopes: form.envelopes,
      },
      {
        onSuccess: () => toast.success("Budget configuration saved"),
        onError: (cause) =>
          toast.error(cause instanceof Error ? cause.message : "Save failed."),
      }
    )
  }

  return (
    <FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="starting-allocation">
            Starting allocation
          </FieldLabel>
          <Input
            id="starting-allocation"
            inputMode="numeric"
            value={String(form.startingAllocation)}
            onChange={(event) =>
              setNumber(event.target.value, (parsed) => ({
                ...form,
                startingAllocation: parsed,
              }))
            }
          />
          <FieldDescription>
            Owner-reported credits, not a verified balance.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="reserve-credits">Unallocated reserve</FieldLabel>
          <Input
            id="reserve-credits"
            inputMode="numeric"
            value={String(form.reserveCredits)}
            onChange={(event) =>
              setNumber(event.target.value, (parsed) => ({
                ...form,
                reserveCredits: parsed,
              }))
            }
          />
          <FieldDescription>
            Excluded from the spendable estimate.
          </FieldDescription>
        </Field>
      </div>
      {form.envelopes.map((envelope, index) => (
        <Field key={envelope.key}>
          <FieldLabel htmlFor={`envelope-${envelope.key}`}>
            {envelope.label}
          </FieldLabel>
          <Input
            id={`envelope-${envelope.key}`}
            inputMode="numeric"
            value={String(envelope.allocated)}
            onChange={(event) =>
              setNumber(event.target.value, (parsed) => ({
                ...form,
                envelopes: form.envelopes.map((entry, i) =>
                  i === index ? { ...entry, allocated: parsed } : entry
                ),
              }))
            }
          />
        </Field>
      ))}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? <Spinner data-icon="inline-start" /> : null}
          Save budget
        </Button>
        <span className="text-[0.7rem] text-muted-foreground">
          Max concurrent paid jobs: {form.maxConcurrentPaidJobs}
        </span>
      </div>
    </FieldGroup>
  )
}

function UsdCapForm({ initial }: { initial: BudgetConfig }) {
  const update = useUpdateBudget()
  const [cap, setCap] = React.useState(() => {
    const parsed = Number(initial.usdMonthlyCap ?? "0")
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"
  })
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const capIsPositive = Number(cap) > 0
  const needsAck = capIsPositive && !acknowledged

  const handleSave = () => {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(cap)) {
      setError("Enter a decimal amount like 5.00 (up to two decimals).")
      return
    }
    if (needsAck) {
      setError("Tick the acknowledgement to allow cash spending.")
      return
    }
    setError(null)
    update.mutate(
      { usdMonthlyCap: Number(cap).toFixed(2) },
      {
        onSuccess: (budget) => {
          setCap(budget.usdMonthlyCap)
          toast.success("USD monthly cap saved")
        },
        onError: (cause) =>
          toast.error(cause instanceof Error ? cause.message : "Save failed."),
      }
    )
  }

  return (
    <FieldGroup>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="usd-cap">USD monthly cap</FieldLabel>
        <Input
          id="usd-cap"
          inputMode="decimal"
          className="sm:max-w-40"
          value={cap}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setCap(event.target.value)
            setError(null)
          }}
        />
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription>
            0.00 keeps every cash-billed studio blocked. The cap limits local
            reservations per calendar month.
          </FieldDescription>
        )}
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id="usd-ack"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
        />
        <div className="flex flex-col gap-0.5">
          <FieldLabel htmlFor="usd-ack">
            I understand this allows real cash spending in live mode
          </FieldLabel>
          <FieldDescription>
            Pay-as-you-go kinds (sound, speech, voices, transcription) bill
            actual money against the provider account when the mode is live.
          </FieldDescription>
        </div>
      </Field>
      <Button
        className="self-start"
        onClick={handleSave}
        disabled={update.isPending || needsAck}
      >
        {update.isPending ? <Spinner data-icon="inline-start" /> : null}
        Save USD cap
      </Button>
    </FieldGroup>
  )
}

function UsdCapCard() {
  const budget = useBudget()
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs">Pay-as-you-go (cash)</CardTitle>
        <CardDescription>
          Monthly USD cap for cash-billed studios. This is a local submission
          control, not a provider-enforced limit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {budget.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : budget.isError ? (
          <QueryError
            title="Budget configuration unavailable"
            error={budget.error}
            onRetry={() => void budget.refetch()}
          />
        ) : budget.data ? (
          <UsdCapForm initial={budget.data} />
        ) : null}
      </CardContent>
    </Card>
  )
}

function BudgetCard() {
  const budget = useBudget()
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs">Budget configuration</CardTitle>
        <CardDescription>
          Owner-reported allocation and local envelopes. Changing these does not
          buy or move provider credits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {budget.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : budget.isError ? (
          <QueryError
            title="Budget configuration unavailable"
            error={budget.error}
            onRetry={() => void budget.refetch()}
          />
        ) : budget.data ? (
          <BudgetForm initial={budget.data} />
        ) : null}
      </CardContent>
    </Card>
  )
}

/** Settings: connection status, budget configuration, theme. */
export function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Workspace connection, budget policy, and appearance."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ConnectionCard />
          <UsdCapCard />
          <ThemeCard />
        </div>
        <BudgetCard />
      </div>
    </div>
  )
}
