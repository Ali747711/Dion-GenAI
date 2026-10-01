import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { MusicNoteSquare01Icon } from "@hugeicons/core-free-icons"

import { RecognizeLyrics } from "@/components/cover/recognize-lyrics"
import { QueryError } from "@/components/shared/query-error"
import { UploadField } from "@/components/studio/upload-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isApiError } from "@/lib/api/client"
import type { Job } from "@/lib/api/types"
import {
  coverInputFromState,
  validateCoverForm,
  type CoverFormState,
} from "@/lib/cover-form"
import { MELODY_ADHERENCE_COPY } from "@/lib/studio-meta"
import { STUDIO_LIMITS } from "@/lib/studio-validation"
import { useCreateJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

const VOCAL_ITEMS = [
  { label: "No preference", value: "any" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
]

interface CoverFormProps {
  state: CoverFormState
  onStateChange: (state: CoverFormState) => void
  blocked: boolean
  onSubmitted: (job: Job) => void
}

/** Cover brief (PRD F2): source upload, rights, lyrics, adherence, style. */
export function CoverForm({
  state,
  onStateChange,
  blocked,
  onSubmitted,
}: CoverFormProps) {
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [attempted, setAttempted] = React.useState(false)
  const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({})

  const localErrors = validateCoverForm(state)
  const errors: Record<string, string> = {
    ...(attempted ? localErrors : {}),
    ...serverErrors,
  }

  const patch = (next: Partial<CoverFormState>) => {
    setServerErrors({})
    onStateChange({ ...state, ...next })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(localErrors).length > 0 || createJob.isPending || blocked) {
      return
    }
    createJob.mutate(
      { kind: "cover", idempotencyKey: key, input: coverInputFromState(state) },
      {
        onSuccess: (job) => {
          toast.success("Cover accepted", {
            description: "Two cover variants are being generated.",
          })
          onSubmitted(job)
          rotateKey()
        },
        onError: (error) => {
          if (isApiError(error) && Object.keys(error.fields).length > 0) {
            setServerErrors(error.fields)
          }
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <UploadField
          purpose="cover_source"
          label="Source audio"
          upload={state.upload}
          error={attempted ? errors.uploadId : undefined}
          onUploadChange={(upload) => patch({ upload })}
        />

        <Field
          orientation="horizontal"
          data-invalid={errors.rightsConfirmed ? true : undefined}
        >
          <Checkbox
            id="cover-rights"
            checked={state.rightsConfirmed}
            aria-invalid={errors.rightsConfirmed ? true : undefined}
            onCheckedChange={(checked) =>
              patch({ rightsConfirmed: checked === true })
            }
          />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="cover-rights">
              I have permission to use this recording
            </FieldLabel>
            {errors.rightsConfirmed ? (
              <FieldError>{errors.rightsConfirmed}</FieldError>
            ) : (
              <FieldDescription>
                Required. Covers of material you have no rights to are not
                submitted.
              </FieldDescription>
            )}
          </div>
        </Field>

        <Field data-invalid={errors.lyrics ? true : undefined}>
          <FieldLabel htmlFor="cover-lyrics">Lyrics</FieldLabel>
          <Textarea
            id="cover-lyrics"
            rows={8}
            placeholder={"[Verse 1]\nWrite or recognize the lyrics to cover…"}
            value={state.lyrics}
            aria-invalid={errors.lyrics ? true : undefined}
            onChange={(event) => patch({ lyrics: event.target.value })}
          />
          <div className="flex items-start justify-between gap-2">
            {errors.lyrics ? (
              <FieldError>{errors.lyrics}</FieldError>
            ) : (
              <FieldDescription>
                Write them yourself or use Recognize lyrics below, then edit
                freely.
              </FieldDescription>
            )}
            <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
              {state.lyrics.length}/{STUDIO_LIMITS.coverLyrics}
            </span>
          </div>
          <RecognizeLyrics
            uploadId={state.upload?.id ?? null}
            onRecognized={(lyrics) => patch({ lyrics })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="cover-adherence">Melody adherence</FieldLabel>
          <ToggleGroup
            id="cover-adherence"
            variant="outline"
            value={[state.melodyAdherence]}
            onValueChange={(groupValue: unknown[]) => {
              const next = groupValue[groupValue.length - 1]
              if (next === "high" || next === "main_melody") {
                patch({ melodyAdherence: next })
              }
            }}
          >
            <ToggleGroupItem value="high" aria-label="High adherence">
              {MELODY_ADHERENCE_COPY.high.label}
            </ToggleGroupItem>
            <ToggleGroupItem value="main_melody" aria-label="Main melody only">
              {MELODY_ADHERENCE_COPY.main_melody.label}
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            {MELODY_ADHERENCE_COPY[state.melodyAdherence].description}
          </FieldDescription>
        </Field>

        <Field data-invalid={errors.musicDescription ? true : undefined}>
          <FieldLabel htmlFor="cover-description">Music description</FieldLabel>
          <Textarea
            id="cover-description"
            rows={3}
            placeholder="A stripped-down acoustic ballad with warm piano…"
            value={state.musicDescription}
            aria-invalid={errors.musicDescription ? true : undefined}
            onChange={(event) => patch({ musicDescription: event.target.value })}
          />
          {errors.musicDescription ? (
            <FieldError>{errors.musicDescription}</FieldError>
          ) : (
            <FieldDescription>
              Description or style — at least one is required.
            </FieldDescription>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.style ? true : undefined}>
            <FieldLabel htmlFor="cover-style">Style</FieldLabel>
            <Input
              id="cover-style"
              placeholder="acoustic folk"
              value={state.style}
              aria-invalid={errors.style ? true : undefined}
              onChange={(event) => patch({ style: event.target.value })}
            />
            {errors.style ? <FieldError>{errors.style}</FieldError> : null}
          </Field>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor="cover-title">Title (optional)</FieldLabel>
            <Input
              id="cover-title"
              value={state.title}
              aria-invalid={errors.title ? true : undefined}
              onChange={(event) => patch({ title: event.target.value })}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
        </div>

        <Field className="sm:max-w-56">
          <FieldLabel htmlFor="cover-vocals">Vocals</FieldLabel>
          <Select
            items={VOCAL_ITEMS}
            value={state.vocalGender ?? "any"}
            onValueChange={(value: unknown) =>
              patch({
                vocalGender:
                  value === "male" || value === "female" ? value : null,
              })
            }
          >
            <SelectTrigger id="cover-vocals" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {VOCAL_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {createJob.isError &&
        !(
          isApiError(createJob.error) &&
          Object.keys(createJob.error.fields).length > 0
        ) ? (
          <QueryError title="Submission failed" error={createJob.error} />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={createJob.isPending || blocked}>
            {createJob.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon
                icon={MusicNoteSquare01Icon}
                data-icon="inline-start"
              />
            )}
            Generate 2 cover variants
          </Button>
          <p className="text-[0.7rem] text-muted-foreground">
            One submission generates two variants of the same cover.
          </p>
        </div>
      </FieldGroup>
    </form>
  )
}
