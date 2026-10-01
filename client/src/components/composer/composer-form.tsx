import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, MusicNote01Icon } from "@hugeicons/core-free-icons"

import { QueryError } from "@/components/shared/query-error"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
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
import type { Job, MusicInput } from "@/lib/api/types"
import { clearDraft, newDraft, saveDraft, type ComposerDraft } from "@/lib/draft"
import {
  parseTags,
  sanitizeMusicInput,
  validateMusicInput,
} from "@/lib/music-validation"
import { useCreateJob } from "@/hooks/use-jobs"
import { useProjects } from "@/hooks/use-projects"

interface ComposerFormProps {
  draft: ComposerDraft
  onDraftChange: (draft: ComposerDraft) => void
  onSubmitted: (job: Job) => void
}

const VOCAL_ITEMS = [
  { label: "No preference", value: "any" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
]

/** Song brief form (PRD F1): local draft, exclusive lyric modes, field errors. */
export function ComposerForm({
  draft,
  onDraftChange,
  onSubmitted,
}: ComposerFormProps) {
  const { data: projects } = useProjects()
  const createJob = useCreateJob()
  const [attempted, setAttempted] = React.useState(false)
  const [clearOpen, setClearOpen] = React.useState(false)
  const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({})
  const [tagsText, setTagsText] = React.useState(draft.input.tags?.join(", ") ?? "")
  const [negativeText, setNegativeText] = React.useState(
    draft.input.negativeTags?.join(", ") ?? ""
  )

  const input = draft.input
  const localErrors = validateMusicInput(input)
  const errors: Record<string, string> = {
    ...(attempted ? localErrors : {}),
    ...serverErrors,
  }

  const setInput = (patch: Partial<MusicInput>) => {
    setServerErrors({})
    const next = { ...draft, input: { ...input, ...patch } }
    onDraftChange(next)
    saveDraft(next)
  }

  const handleClear = () => {
    setClearOpen(false)
    clearDraft()
    setTagsText("")
    setNegativeText("")
    setServerErrors({})
    setAttempted(false)
    onDraftChange(newDraft())
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(localErrors).length > 0 || createJob.isPending) return
    createJob.mutate(
      {
        kind: "music",
        idempotencyKey: draft.idempotencyKey,
        input: sanitizeMusicInput(input),
        projectId: draft.projectId ?? undefined,
      },
      {
        onSuccess: (job) => {
          toast.success("Generation accepted", {
            description: "Two variants are being generated.",
          })
          onSubmitted(job)
          // New key for the next submission; retries of THIS submission
          // reuse the old key because the mutation already succeeded.
          const next = { ...draft, idempotencyKey: crypto.randomUUID() }
          onDraftChange(next)
          saveDraft(next)
        },
        onError: (error) => {
          if (isApiError(error) && Object.keys(error.fields).length > 0) {
            setServerErrors(error.fields)
          }
        },
      }
    )
  }

  const projectItems = [
    { label: "No project", value: "none" },
    ...(projects?.map((project) => ({
      label: project.name,
      value: project.id,
    })) ?? []),
  ]

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={errors.prompt ? true : undefined}>
          <FieldLabel htmlFor="prompt">Song description</FieldLabel>
          <Textarea
            id="prompt"
            rows={4}
            placeholder="A slow-burning synthwave ballad about leaving a city at night…"
            value={input.prompt}
            aria-invalid={errors.prompt ? true : undefined}
            onChange={(event) => setInput({ prompt: event.target.value })}
          />
          {errors.prompt ? (
            <FieldError>{errors.prompt}</FieldError>
          ) : (
            <FieldDescription>
              Required. Describe genre, mood, instrumentation, and story.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="lyrics-mode">Lyrics</FieldLabel>
          <ToggleGroup
            id="lyrics-mode"
            variant="outline"
            value={[input.lyricsMode]}
            onValueChange={(groupValue: unknown[]) => {
              const next = groupValue[groupValue.length - 1]
              if (next === "lyrics" || next === "generate") {
                setInput({ lyricsMode: next })
              }
            }}
          >
            <ToggleGroupItem value="lyrics" aria-label="Write lyrics myself">
              Write lyrics
            </ToggleGroupItem>
            <ToggleGroupItem
              value="generate"
              aria-label="Generate lyrics from a prompt"
            >
              Generate lyrics
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            The two modes are mutually exclusive; only the active one is
            submitted.
          </FieldDescription>
        </Field>

        {input.lyricsMode === "lyrics" ? (
          <Field data-invalid={errors.lyrics ? true : undefined}>
            <FieldLabel htmlFor="lyrics">Your lyrics</FieldLabel>
            <Textarea
              id="lyrics"
              rows={8}
              placeholder={"[Verse 1]\nNeon rivers on the windshield…"}
              value={input.lyrics ?? ""}
              aria-invalid={errors.lyrics ? true : undefined}
              onChange={(event) => setInput({ lyrics: event.target.value })}
            />
            {errors.lyrics ? <FieldError>{errors.lyrics}</FieldError> : null}
          </Field>
        ) : (
          <Field data-invalid={errors.lyricsPrompt ? true : undefined}>
            <FieldLabel htmlFor="lyrics-prompt">Lyrics brief</FieldLabel>
            <Textarea
              id="lyrics-prompt"
              rows={3}
              placeholder="Bittersweet goodbye to a hometown, second verse turns hopeful…"
              value={input.lyricsPrompt ?? ""}
              aria-invalid={errors.lyricsPrompt ? true : undefined}
              onChange={(event) => setInput({ lyricsPrompt: event.target.value })}
            />
            {errors.lyricsPrompt ? (
              <FieldError>{errors.lyricsPrompt}</FieldError>
            ) : (
              <FieldDescription>
                The provider writes the lyrics from this brief.
              </FieldDescription>
            )}
          </Field>
        )}

        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="title">Title (optional)</FieldLabel>
          <Input
            id="title"
            value={input.title ?? ""}
            aria-invalid={errors.title ? true : undefined}
            onChange={(event) => setInput({ title: event.target.value })}
          />
          {errors.title ? <FieldError>{errors.title}</FieldError> : null}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.tags ? true : undefined}>
            <FieldLabel htmlFor="tags">Style tags</FieldLabel>
            <Input
              id="tags"
              placeholder="synthwave, 80s, dreamy"
              value={tagsText}
              aria-invalid={errors.tags ? true : undefined}
              onChange={(event) => {
                setTagsText(event.target.value)
                setInput({ tags: parseTags(event.target.value) })
              }}
            />
            {errors.tags ? (
              <FieldError>{errors.tags}</FieldError>
            ) : (
              <FieldDescription>Comma-separated, up to 10.</FieldDescription>
            )}
          </Field>
          <Field data-invalid={errors.negativeTags ? true : undefined}>
            <FieldLabel htmlFor="negative-tags">Avoid</FieldLabel>
            <Input
              id="negative-tags"
              placeholder="trap, heavy metal"
              value={negativeText}
              aria-invalid={errors.negativeTags ? true : undefined}
              onChange={(event) => {
                setNegativeText(event.target.value)
                setInput({ negativeTags: parseTags(event.target.value) })
              }}
            />
            {errors.negativeTags ? (
              <FieldError>{errors.negativeTags}</FieldError>
            ) : (
              <FieldDescription>Styles to steer away from.</FieldDescription>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="vocal-gender">Vocals</FieldLabel>
            <Select
              items={VOCAL_ITEMS}
              value={input.vocalGender ?? "any"}
              onValueChange={(value: unknown) =>
                setInput({
                  vocalGender:
                    value === "male" || value === "female" ? value : null,
                })
              }
            >
              <SelectTrigger id="vocal-gender" className="w-full">
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
          <Field>
            <FieldLabel htmlFor="project">Project</FieldLabel>
            <Select
              items={projectItems}
              value={draft.projectId ?? "none"}
              onValueChange={(value: unknown) => {
                const next = {
                  ...draft,
                  projectId:
                    typeof value === "string" && value !== "none" ? value : null,
                }
                onDraftChange(next)
                saveDraft(next)
              }}
            >
              <SelectTrigger id="project" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {projectItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {createJob.isError &&
        !(isApiError(createJob.error) &&
          Object.keys(createJob.error.fields).length > 0) ? (
          <QueryError title="Submission failed" error={createJob.error} />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={createJob.isPending}>
            {createJob.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon icon={MusicNote01Icon} data-icon="inline-start" />
            )}
            Generate 2 variants
          </Button>
          <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="ghost">
                  <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
                  Clear draft
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear this draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  The locally saved brief will be removed. Submitted jobs are
                  not affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep draft</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>
                  Clear draft
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-[0.7rem] text-muted-foreground">
            Drafts are saved locally until you clear them.
          </p>
        </div>
      </FieldGroup>
    </form>
  )
}
