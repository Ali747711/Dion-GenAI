import * as React from "react"
import { useLocation } from "react-router"
import { toast } from "sonner"

import { ComposerForm } from "@/components/composer/composer-form"
import { EstimatePanel } from "@/components/composer/estimate-panel"
import { LatestJobPanel } from "@/components/composer/latest-job-panel"
import { PageHeader } from "@/components/shared/page-header"
import type { Job, MusicInput } from "@/lib/api/types"
import {
  EMPTY_MUSIC_INPUT,
  loadDraft,
  newDraft,
  saveDraft,
  type ComposerDraft,
} from "@/lib/draft"
import { validateMusicInput } from "@/lib/music-validation"

interface RegenerateState {
  input?: MusicInput
}

function draftFromInput(input: MusicInput): ComposerDraft {
  return {
    ...newDraft(),
    input: { ...EMPTY_MUSIC_INPUT, ...input },
  }
}

/** Original-song composer: brief on the left, cost + latest pair on the right. */
export function CreateMusicPage() {
  const location = useLocation()
  const regenerate = (location.state as RegenerateState | null)?.input

  const [draft, setDraft] = React.useState<ComposerDraft>(() => {
    if (regenerate) {
      const fromJob = draftFromInput(regenerate)
      saveDraft(fromJob)
      return fromJob
    }
    return loadDraft() ?? newDraft()
  })
  const [latestJobId, setLatestJobId] = React.useState<string>()

  const isValid = Object.keys(validateMusicInput(draft.input)).length === 0

  const handleRegenerate = (input: MusicInput) => {
    const next = draftFromInput(input)
    setDraft(next)
    saveDraft(next)
    toast.info("Brief copied into the composer", {
      description: "Edit it and submit when ready — nothing was sent yet.",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmitted = (job: Job) => {
    setLatestJobId(job.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Create music"
        description="One submission generates two variants of the same brief."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <ComposerForm
          key={draft.idempotencyKey}
          draft={draft}
          onDraftChange={setDraft}
          onSubmitted={handleSubmitted}
        />
        <div className="flex flex-col gap-4">
          <EstimatePanel input={draft.input} isValid={isValid} />
          <LatestJobPanel jobId={latestJobId} onRegenerate={handleRegenerate} />
        </div>
      </div>
    </div>
  )
}
