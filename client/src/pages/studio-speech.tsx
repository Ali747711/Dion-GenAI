import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiVoiceIcon } from "@hugeicons/core-free-icons"

import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { EnhanceEmotion } from "@/components/speech/enhance-emotion"
import { VoicePicker } from "@/components/speech/voice-picker"
import { CapabilityNotice } from "@/components/studio/capability-notice"
import { CostPreview } from "@/components/studio/cost-preview"
import { ResultAssetCard } from "@/components/studio/result-asset-card"
import { StudioJobPanel } from "@/components/studio/studio-job-panel"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isApiError } from "@/lib/api/client"
import type { SpeechInput } from "@/lib/api/studio-types"
import { STUDIO_LIMITS, validateSpeechInput } from "@/lib/studio-validation"
import { useCreateJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

const COUNT_FORMAT = new Intl.NumberFormat("en-US")

/** Text-to-speech studio (PRD F5): voices, speed, language, PAYGO billing. */
export function SpeechStudioPage() {
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [text, setText] = React.useState("")
  const [voiceId, setVoiceId] = React.useState("")
  const [format, setFormat] = React.useState<"wav" | "mp3">("wav")
  const [speed, setSpeed] = React.useState(1)
  const [targetLang, setTargetLang] = React.useState("")
  const [trimSilence, setTrimSilence] = React.useState(false)
  const [attempted, setAttempted] = React.useState(false)
  const [blocked, setBlocked] = React.useState(false)
  const [latestJobId, setLatestJobId] = React.useState<string>()

  const longForm = text.trim().length > STUDIO_LIMITS.speechMp3Text
  // MP3 is impossible for long-form text (the provider streams WAV), so the
  // effective format is derived rather than force-updating state.
  const effectiveFormat = longForm ? "wav" : format

  const input: SpeechInput = {
    text: text.trim(),
    voiceId,
    format: effectiveFormat,
    speed,
    trimSilence,
  }
  const lang = targetLang.trim()
  if (lang) input.targetLang = lang

  const localErrors = validateSpeechInput(input)
  const errors = attempted ? localErrors : {}
  const isValid = Object.keys(localErrors).length === 0

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttempted(true)
    if (!isValid || createJob.isPending || blocked) return
    createJob.mutate(
      { kind: "speech", idempotencyKey: key, input },
      {
        onSuccess: (job) => {
          toast.success("Speech generation accepted")
          setLatestJobId(job.id)
          rotateKey()
        },
        onError: (cause) => {
          if (!isApiError(cause) || Object.keys(cause.fields).length === 0) {
            toast.error(
              cause instanceof Error ? cause.message : "Submission failed."
            )
          }
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Speech"
        description="Text-to-speech with your voice library, billed as pay-as-you-go cash."
      />
      <CapabilityNotice capabilityKey="speech" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.text ? true : undefined}>
              <FieldLabel htmlFor="speech-text">Text</FieldLabel>
              <Textarea
                id="speech-text"
                rows={8}
                maxLength={STUDIO_LIMITS.speechText}
                placeholder="Paste or write the text to be spoken…"
                value={text}
                aria-invalid={errors.text ? true : undefined}
                onChange={(event) => setText(event.target.value)}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.text ? (
                  <FieldError>{errors.text}</FieldError>
                ) : (
                  <FieldDescription>
                    Up to {COUNT_FORMAT.format(STUDIO_LIMITS.speechMp3Text)}{" "}
                    characters normally; long-form up to{" "}
                    {COUNT_FORMAT.format(STUDIO_LIMITS.speechText)} streams as
                    WAV.
                  </FieldDescription>
                )}
                <span className="shrink-0 font-mono text-[0.7rem] text-muted-foreground tabular-nums">
                  {COUNT_FORMAT.format(text.length)}/
                  {COUNT_FORMAT.format(STUDIO_LIMITS.speechText)}
                </span>
              </div>
              <EnhanceEmotion text={text} onEnhanced={setText} />
            </Field>

            <VoicePicker
              value={voiceId}
              onValueChange={setVoiceId}
              error={errors.voiceId}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={errors.format ? true : undefined}>
                <FieldLabel htmlFor="speech-format">Format</FieldLabel>
                <ToggleGroup
                  id="speech-format"
                  variant="outline"
                  value={[effectiveFormat]}
                  onValueChange={(groupValue: unknown[]) => {
                    const next = groupValue[groupValue.length - 1]
                    if (next === "wav" || (next === "mp3" && !longForm)) {
                      setFormat(next)
                    }
                  }}
                >
                  <ToggleGroupItem value="wav" aria-label="WAV format">
                    WAV
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="mp3"
                    aria-label="MP3 format"
                    disabled={longForm}
                  >
                    MP3
                  </ToggleGroupItem>
                </ToggleGroup>
                {errors.format ? (
                  <FieldError>{errors.format}</FieldError>
                ) : longForm ? (
                  <FieldDescription>
                    MP3 is disabled above{" "}
                    {COUNT_FORMAT.format(STUDIO_LIMITS.speechMp3Text)}{" "}
                    characters — long-form speech streams as WAV.
                  </FieldDescription>
                ) : null}
              </Field>

              <Field data-invalid={errors.targetLang ? true : undefined}>
                <FieldLabel htmlFor="speech-lang">
                  Target language (optional)
                </FieldLabel>
                <Input
                  id="speech-lang"
                  placeholder="en, zh+en…"
                  maxLength={STUDIO_LIMITS.speechLang}
                  value={targetLang}
                  aria-invalid={errors.targetLang ? true : undefined}
                  onChange={(event) => setTargetLang(event.target.value)}
                />
                {errors.targetLang ? (
                  <FieldError>{errors.targetLang}</FieldError>
                ) : (
                  <FieldDescription>
                    Leave empty to keep the text's own language.
                  </FieldDescription>
                )}
              </Field>
            </div>

            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Field data-invalid={errors.speed ? true : undefined}>
                <FieldLabel htmlFor="speech-speed">
                  Speed: {speed.toFixed(2)}×
                </FieldLabel>
                <Slider
                  id="speech-speed"
                  aria-label="Speech speed"
                  min={STUDIO_LIMITS.speechSpeedMin}
                  max={STUDIO_LIMITS.speechSpeedMax}
                  step={0.05}
                  value={[speed]}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value
                    if (typeof next === "number") {
                      setSpeed(Math.round(next * 100) / 100)
                    }
                  }}
                />
                {errors.speed ? (
                  <FieldError>{errors.speed}</FieldError>
                ) : (
                  <FieldDescription>0.5× to 2×.</FieldDescription>
                )}
              </Field>

              <Field orientation="horizontal" className="sm:mt-5">
                <Switch
                  id="speech-trim"
                  checked={trimSilence}
                  onCheckedChange={(checked) =>
                    setTrimSilence(checked === true)
                  }
                />
                <FieldLabel htmlFor="speech-trim">Trim silence</FieldLabel>
              </Field>
            </div>

            {createJob.isError &&
            isApiError(createJob.error) &&
            Object.keys(createJob.error.fields).length > 0 ? (
              <QueryError title="Submission rejected" error={createJob.error} />
            ) : null}

            <Button
              type="submit"
              className="self-start"
              disabled={createJob.isPending || blocked}
            >
              {createJob.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon icon={AiVoiceIcon} data-icon="inline-start" />
              )}
              Generate speech
            </Button>
          </FieldGroup>
        </form>

        <div className="flex flex-col gap-4">
          <CostPreview
            kind="speech"
            input={input}
            isValid={isValid}
            description="Speech · billed per character ($15 / 1M chars documented)"
            onBlockedChange={setBlocked}
          />
          <StudioJobPanel
            kind="speech"
            jobId={latestJobId}
            title="Latest speech"
            emptyIcon={AiVoiceIcon}
            emptyTitle="No speech yet"
            emptyDescription="Your latest generated speech will appear here."
          >
            {(job) => (
              <>
                {job.variants.map((variant) => (
                  <ResultAssetCard
                    key={variant.id}
                    variant={variant}
                    title="Speech"
                  />
                ))}
              </>
            )}
          </StudioJobPanel>
        </div>
      </div>
    </div>
  )
}
