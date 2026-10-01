import * as React from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { CostPreview } from "@/components/studio/cost-preview"
import { ResultAssetCard } from "@/components/studio/result-asset-card"
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
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { isApiError } from "@/lib/api/client"
import type { VoiceDesignInput } from "@/lib/api/studio-types"
import { isTerminalJobStatus } from "@/lib/api/types"
import { STUDIO_LIMITS, validateVoiceDesignInput } from "@/lib/studio-validation"
import { useCreateJob, useJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

interface VoiceDesignDialogProps {
  trigger: React.ReactElement
}

/** Design a synthetic voice from a description; shows resulting previews. */
export function VoiceDesignDialog({ trigger }: VoiceDesignDialogProps) {
  const queryClient = useQueryClient()
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [open, setOpen] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [guidance, setGuidance] = React.useState(5)
  const [loudness, setLoudness] = React.useState(0.5)
  const [name, setName] = React.useState("")
  const [attempted, setAttempted] = React.useState(false)
  const [blocked, setBlocked] = React.useState(false)
  const [jobId, setJobId] = React.useState<string>()
  const job = useJob(jobId)
  const notifiedRef = React.useRef<string | null>(null)

  const input: VoiceDesignInput = {
    voiceDescription: description.trim(),
    guidanceScale: guidance,
    loudness,
  }
  const trimmedName = name.trim()
  if (trimmedName) input.name = trimmedName

  const localErrors = validateVoiceDesignInput(input)
  const errors = attempted ? localErrors : {}
  const isValid = Object.keys(localErrors).length === 0

  const data = job.data
  const running =
    createJob.isPending ||
    (data !== undefined && !isTerminalJobStatus(data.status))

  React.useEffect(() => {
    if (!data || notifiedRef.current === data.id) return
    if (data.result?.kind !== "voice_design") return
    notifiedRef.current = data.id
    toast.success("Voice previews ready", {
      description: "Listen below — the designed voices are saved in Designed voices.",
    })
    void queryClient.invalidateQueries({ queryKey: ["voices"] })
  }, [data, queryClient])

  const reset = () => {
    setDescription("")
    setGuidance(5)
    setLoudness(0.5)
    setName("")
    setAttempted(false)
    setJobId(undefined)
    notifiedRef.current = null
  }

  const handleSubmit = () => {
    setAttempted(true)
    if (!isValid || running || blocked) return
    createJob.mutate(
      { kind: "voice_design", idempotencyKey: key, input },
      {
        onSuccess: (created) => {
          setJobId(created.id)
          rotateKey()
        },
        onError: (cause) => {
          toast.error(
            isApiError(cause) ? cause.message : "Voice design failed to start."
          )
        },
      }
    )
  }

  const failed =
    data !== undefined &&
    isTerminalJobStatus(data.status) &&
    data.status !== "succeeded"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Design a voice</DialogTitle>
          <DialogDescription>
            Generates synthetic voice previews from a text description. The
            documented price is $0.30 per generation, billed as pay-as-you-go
            cash.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={errors.voiceDescription ? true : undefined}>
            <FieldLabel htmlFor="design-description">
              Voice description
            </FieldLabel>
            <Textarea
              id="design-description"
              rows={4}
              maxLength={STUDIO_LIMITS.voiceDescriptionMax}
              placeholder="A warm, low female voice in her 40s, calm and confident, slight rasp…"
              value={description}
              aria-invalid={errors.voiceDescription ? true : undefined}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="flex items-start justify-between gap-2">
              {errors.voiceDescription ? (
                <FieldError>{errors.voiceDescription}</FieldError>
              ) : (
                <FieldDescription>
                  {STUDIO_LIMITS.voiceDescriptionMin}–
                  {STUDIO_LIMITS.voiceDescriptionMax} characters.
                </FieldDescription>
              )}
              <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                {description.length}/{STUDIO_LIMITS.voiceDescriptionMax}
              </span>
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={errors.guidanceScale ? true : undefined}>
              <FieldLabel htmlFor="design-guidance">
                Guidance: {guidance}
              </FieldLabel>
              <Slider
                id="design-guidance"
                aria-label="Guidance scale"
                min={0}
                max={100}
                step={1}
                value={[guidance]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  if (typeof next === "number") setGuidance(next)
                }}
              />
              <FieldDescription>
                Higher follows the description more literally.
              </FieldDescription>
            </Field>
            <Field data-invalid={errors.loudness ? true : undefined}>
              <FieldLabel htmlFor="design-loudness">
                Loudness: {loudness.toFixed(2)}
              </FieldLabel>
              <Slider
                id="design-loudness"
                aria-label="Loudness"
                min={-1}
                max={1}
                step={0.05}
                value={[loudness]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  if (typeof next === "number") {
                    setLoudness(Math.round(next * 100) / 100)
                  }
                }}
              />
              <FieldDescription>−1 (quiet) to 1 (loud).</FieldDescription>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="design-name">
              Display name (optional)
            </FieldLabel>
            <Input
              id="design-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldDescription>
              Used as the local name for the resulting voices.
            </FieldDescription>
          </Field>

          <CostPreview
            kind="voice_design"
            input={input}
            isValid={isValid}
            description="Voice design · $0.30 per generation (documented)"
            onBlockedChange={setBlocked}
          />

          {data && data.variants.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium">Previews</p>
              {data.variants.map((variant, index) => (
                <ResultAssetCard
                  key={variant.id}
                  variant={variant}
                  title={`Preview ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
          {failed ? (
            <p className="text-xs text-destructive">
              {data?.errorMessage ?? "Voice design did not complete."}
            </p>
          ) : null}
        </FieldGroup>
        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit} disabled={running || blocked}>
            {running ? <Spinner data-icon="inline-start" /> : null}
            {running ? "Designing…" : "Design voice ($0.30)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
