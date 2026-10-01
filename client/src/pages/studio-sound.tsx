import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { AudioWave01Icon } from "@hugeicons/core-free-icons"

import {
  DownloadAssetButton,
  FavoriteAssetButton,
  PlayAssetButton,
} from "@/components/library/asset-actions"
import { ListSkeleton } from "@/components/shared/list-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { CapabilityNotice } from "@/components/studio/capability-notice"
import { CostPreview } from "@/components/studio/cost-preview"
import { ResultAssetCard } from "@/components/studio/result-asset-card"
import { StudioJobPanel } from "@/components/studio/studio-job-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isApiError } from "@/lib/api/client"
import type { SoundInput } from "@/lib/api/studio-types"
import { formatDuration, formatRelativeTime } from "@/lib/format"
import { STUDIO_LIMITS, validateSoundInput } from "@/lib/studio-validation"
import { useAssetList } from "@/hooks/use-assets"
import { useCreateJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

function RecentSounds() {
  const list = useAssetList({ source: "sound", limit: 10 })
  const assets = list.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs">Recent sound effects</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {list.isLoading ? (
          <ListSkeleton rows={3} rowClassName="h-8" />
        ) : list.isError ? (
          <QueryError
            title="Could not load sound assets"
            error={list.error}
            onRetry={() => void list.refetch()}
          />
        ) : assets.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            Generated sound effects will be listed here.
          </p>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-2 py-0.5">
              <PlayAssetButton asset={asset} queue={assets} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">
                  {asset.title}
                </span>
                <span className="text-[0.7rem] text-muted-foreground">
                  {formatDuration(asset.durationSeconds)} ·{" "}
                  {formatRelativeTime(asset.createdAt)}
                </span>
              </div>
              <FavoriteAssetButton asset={asset} />
              <DownloadAssetButton asset={asset} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

/** Sound-effect studio (PRD F5): prompt, 1–30 s, WAV/MP3, PAYGO billing. */
export function SoundStudioPage() {
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [prompt, setPrompt] = React.useState("")
  const [durationSeconds, setDurationSeconds] = React.useState(10)
  const [format, setFormat] = React.useState<"wav" | "mp3">("wav")
  const [attempted, setAttempted] = React.useState(false)
  const [blocked, setBlocked] = React.useState(false)
  const [latestJobId, setLatestJobId] = React.useState<string>()

  const input: SoundInput = { prompt: prompt.trim(), durationSeconds, format }
  const localErrors = validateSoundInput(input)
  const errors = attempted ? localErrors : {}
  const isValid = Object.keys(localErrors).length === 0

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttempted(true)
    if (!isValid || createJob.isPending || blocked) return
    createJob.mutate(
      { kind: "sound", idempotencyKey: key, input },
      {
        onSuccess: (job) => {
          toast.success("Sound generation accepted")
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
        title="Sound effects"
        description="Short generated sounds, 1–30 seconds, billed as pay-as-you-go cash."
      />
      <CapabilityNotice capabilityKey="sound" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.prompt ? true : undefined}>
              <FieldLabel htmlFor="sound-prompt">Sound description</FieldLabel>
              <Textarea
                id="sound-prompt"
                rows={4}
                maxLength={STUDIO_LIMITS.soundPrompt}
                placeholder="Heavy wooden door creaking open in a stone hallway…"
                value={prompt}
                aria-invalid={errors.prompt ? true : undefined}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <div className="flex items-start justify-between gap-2">
                {errors.prompt ? (
                  <FieldError>{errors.prompt}</FieldError>
                ) : (
                  <FieldDescription>
                    Describe the sound, its material, and the space around it.
                  </FieldDescription>
                )}
                <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                  {prompt.length}/{STUDIO_LIMITS.soundPrompt}
                </span>
              </div>
            </Field>

            <Field data-invalid={errors.durationSeconds ? true : undefined}>
              <FieldLabel htmlFor="sound-duration">
                Duration: {durationSeconds} s
              </FieldLabel>
              <Slider
                id="sound-duration"
                aria-label="Duration in seconds"
                min={STUDIO_LIMITS.soundDurationMin}
                max={STUDIO_LIMITS.soundDurationMax}
                step={1}
                value={[durationSeconds]}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  if (typeof next === "number") setDurationSeconds(next)
                }}
              />
              {errors.durationSeconds ? (
                <FieldError>{errors.durationSeconds}</FieldError>
              ) : (
                <FieldDescription>1 to 30 seconds.</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="sound-format">Format</FieldLabel>
              <ToggleGroup
                id="sound-format"
                variant="outline"
                value={[format]}
                onValueChange={(groupValue: unknown[]) => {
                  const next = groupValue[groupValue.length - 1]
                  if (next === "wav" || next === "mp3") setFormat(next)
                }}
              >
                <ToggleGroupItem value="wav" aria-label="WAV format">
                  WAV
                </ToggleGroupItem>
                <ToggleGroupItem value="mp3" aria-label="MP3 format">
                  MP3
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>

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
                <HugeiconsIcon
                  icon={AudioWave01Icon}
                  data-icon="inline-start"
                />
              )}
              Generate sound
            </Button>
          </FieldGroup>
        </form>

        <div className="flex flex-col gap-4">
          <CostPreview
            kind="sound"
            input={input}
            isValid={isValid}
            description="Sound effect · 1 output per submission"
            onBlockedChange={setBlocked}
          />
          <StudioJobPanel
            kind="sound"
            jobId={latestJobId}
            title="Latest sound"
            emptyIcon={AudioWave01Icon}
            emptyTitle="No sounds yet"
            emptyDescription="Your latest generated sound will appear here."
          >
            {(job) => (
              <>
                {job.variants.map((variant) => (
                  <ResultAssetCard
                    key={variant.id}
                    variant={variant}
                    title="Sound effect"
                  />
                ))}
              </>
            )}
          </StudioJobPanel>
          <RecentSounds />
        </div>
      </div>
    </div>
  )
}
