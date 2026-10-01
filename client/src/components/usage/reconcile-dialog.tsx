import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useCreateReconciliation } from "@/hooks/use-usage"

/**
 * Records an owner-verified adjustment in the local ledger. It moves no money
 * and does not touch the provider account.
 */
export function ReconcileDialog() {
  const create = useCreateReconciliation()
  const [open, setOpen] = React.useState(false)
  const [credits, setCredits] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [source, setSource] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {}
    const value = Number(credits)
    if (!credits.trim() || !Number.isInteger(value) || value === 0) {
      nextErrors.credits =
        "Enter a non-zero signed integer (negative for extra spend, positive for corrections back)."
    }
    if (!reason.trim()) nextErrors.reason = "Describe why this adjustment exists."
    if (!source.trim()) {
      nextErrors.source = "Name the evidence (e.g. provider dashboard, email)."
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    create.mutate(
      { credits: value, reason: reason.trim(), source: source.trim() },
      {
        onSuccess: () => {
          toast.success("Reconciliation recorded")
          setOpen(false)
          setCredits("")
          setReason("")
          setSource("")
        },
        onError: (cause) => {
          toast.error(
            cause instanceof Error ? cause.message : "Recording failed."
          )
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline">Record reconciliation</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a reconciliation</DialogTitle>
          <DialogDescription>
            Adds a local ledger entry backed by provider evidence. No money
            moves and the provider account is not changed.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={errors.credits ? true : undefined}>
            <FieldLabel htmlFor="rec-credits">Credits (signed)</FieldLabel>
            <Input
              id="rec-credits"
              inputMode="numeric"
              placeholder="-2700"
              value={credits}
              aria-invalid={errors.credits ? true : undefined}
              onChange={(event) => setCredits(event.target.value)}
            />
            {errors.credits ? (
              <FieldError>{errors.credits}</FieldError>
            ) : (
              <FieldDescription>
                Negative records extra spend; positive corrects the estimate
                back up.
              </FieldDescription>
            )}
          </Field>
          <Field data-invalid={errors.reason ? true : undefined}>
            <FieldLabel htmlFor="rec-reason">Reason</FieldLabel>
            <Input
              id="rec-reason"
              placeholder="Provider charged 3,150 for job …"
              value={reason}
              aria-invalid={errors.reason ? true : undefined}
              onChange={(event) => setReason(event.target.value)}
            />
            {errors.reason ? <FieldError>{errors.reason}</FieldError> : null}
          </Field>
          <Field data-invalid={errors.source ? true : undefined}>
            <FieldLabel htmlFor="rec-source">Evidence source</FieldLabel>
            <Input
              id="rec-source"
              placeholder="Provider dashboard screenshot 2026-09-30"
              value={source}
              aria-invalid={errors.source ? true : undefined}
              onChange={(event) => setSource(event.target.value)}
            />
            {errors.source ? <FieldError>{errors.source}</FieldError> : null}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? <Spinner data-icon="inline-start" /> : null}
            Record entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
