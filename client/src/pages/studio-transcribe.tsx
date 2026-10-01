import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiTranscribeAudioIcon } from "@hugeicons/core-free-icons"

import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { CapabilityNotice } from "@/components/studio/capability-notice"
import { CostPreview } from "@/components/studio/cost-preview"
import { StudioJobPanel } from "@/components/studio/studio-job-panel"
import { UploadField } from "@/components/studio/upload-field"
import { TranscriptView } from "@/components/transcribe/transcript-view"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api/client"
import type { TranscriptionInput, Upload } from "@/lib/api/studio-types"
import { useCreateJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

/** Transcription studio (PRD F5): upload, detected language, export. */
export function TranscribeStudioPage() {
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [upload, setUpload] = React.useState<Upload | null>(null)
  const [language, setLanguage] = React.useState("")
  const [attempted, setAttempted] = React.useState(false)
  const [blocked, setBlocked] = React.useState(false)
  const [latestJobId, setLatestJobId] = React.useState<string>()

  const input: TranscriptionInput = { uploadId: upload?.id ?? "" }
  const lang = language.trim()
  if (lang) input.language = lang
  const isValid = Boolean(upload)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttempted(true)
    if (!isValid || createJob.isPending || blocked) return
    createJob.mutate(
      { kind: "transcription", idempotencyKey: key, input },
      {
        onSuccess: (job) => {
          toast.success("Transcription accepted")
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
        title="Transcribe"
        description="Speech-to-text with timestamps and speakers, billed per second of audio."
      />
      <CapabilityNotice capabilityKey="transcribe" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <UploadField
              purpose="transcription"
              label="Audio to transcribe"
              upload={upload}
              error={
                attempted && !upload ? "Upload the audio first." : undefined
              }
              onUploadChange={setUpload}
            />
            <Field className="sm:max-w-56">
              <FieldLabel htmlFor="transcribe-lang">
                Language (optional)
              </FieldLabel>
              <Input
                id="transcribe-lang"
                placeholder="en"
                maxLength={10}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              />
              <FieldDescription>
                Leave empty to let the provider detect it.
              </FieldDescription>
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
                  icon={AiTranscribeAudioIcon}
                  data-icon="inline-start"
                />
              )}
              Transcribe
            </Button>
          </FieldGroup>
        </form>

        <div className="flex flex-col gap-4">
          <CostPreview
            kind="transcription"
            input={input}
            isValid={isValid}
            description={
              upload?.durationSeconds
                ? `Transcription · ${Math.ceil(upload.durationSeconds)} s of audio ($0.0006/s documented)`
                : "Transcription · cost follows the upload duration"
            }
            onBlockedChange={setBlocked}
          />
          <StudioJobPanel
            kind="transcription"
            jobId={latestJobId}
            title="Latest transcription"
            emptyIcon={AiTranscribeAudioIcon}
            emptyTitle="No transcriptions yet"
            emptyDescription="Your latest transcript will appear here with timestamps and exports."
          >
            {(job) =>
              job.result?.kind === "transcription" ? (
                <TranscriptView
                  jobId={job.id}
                  language={job.result.language}
                  transcript={job.result.transcript}
                  durationSeconds={job.result.durationSeconds}
                  segments={job.result.segments}
                />
              ) : null
            }
          </StudioJobPanel>
        </div>
      </div>
    </div>
  )
}
